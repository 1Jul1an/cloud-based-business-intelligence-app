// src/syncWawiToBi.ts
// Hinweis: Funktion wurde lokal mit Beispiel-Input über Terminal getestet.
// Im definierten Use Case (WaWi → BI Synchronisierung) zeigte sich das erwartete Verhalten.
// Ausführliche Tests (inkl. Integration mit Frontend & Edge Cases) stehen noch aus.

import { queryWawi, queryBi } from "./db";
import { APIGatewayProxyHandler } from "aws-lambda";

type PlatformRow = { platform_id: number; name: string };
type WaWiPlatformRow = { platform_id_sale: number; name: string };
type WaWiProductRow = { MatID: number; Name: string; SKU: string; EKPreis: number | null; Active?: 0 | 1 | boolean };
type WaWiOrderRow = {
  BestellID: number;
  Bestelldatum: string;          // 'YYYY-MM-DD HH:MM:SS'
  EingangZeitStempel: string | null;
  supplier_name: string;
};
type WaWiSaleRow = {
  VerkID: number;
  MatID: number;
  platform_id_sale: number;
  ts: string;                    // 'YYYY-MM-DD HH:MM:SS'
  Menge: number;
};

export const syncData: APIGatewayProxyHandler = async () => {
  try {
    console.log("Starting WaWi → BI sync");

    // 1) Plattformen angleichen (WaWi → BI)
    const wawiPlatforms: WaWiPlatformRow[] = await queryWawi(
      `SELECT platform_id_sale, name FROM plattform_verkauf`
    );

    // Upsert in BI
    for (const p of wawiPlatforms) {
      await queryBi(
        `
        INSERT INTO dim_platform (platform_id, name)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
        `,
        [p.platform_id_sale, p.name]
      );
    }

    // Plattform-Mapping aufbauen (BI als Quelle der Wahrheit)
    const biPlatforms: PlatformRow[] = await queryBi(
      `SELECT platform_id, name FROM dim_platform`
    );
    const platformIdMap = new Map<number, number>(); // WaWi_id -> BI_id
    for (const p of biPlatforms) platformIdMap.set(p.platform_id, p.platform_id);

    console.log(`Synced ${biPlatforms.length} platforms`);

    // 2) Produkte angleichen (WaWi → BI)
    const wawiProducts: WaWiProductRow[] = await queryWawi(
      `
      SELECT MatID, Name, SKU, EKPreis, Active
      FROM material
      `
    );

    const productIds: number[] = [];
    for (const prod of wawiProducts) {
      // optional: nur aktive Produkte
      if (prod.Active === false || prod.Active === 0) continue;

      await queryBi(
        `
        INSERT INTO dim_product (product_id, sku, name, ref_cost)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          sku = VALUES(sku),
          name = VALUES(name),
          ref_cost = VALUES(ref_cost)
        `,
        [prod.MatID, prod.SKU, prod.Name, prod.EKPreis ?? null]
      );
      productIds.push(prod.MatID);
    }
    console.log(`Synced ${productIds.length} products`);

    // 3) product_refprice vorbereiten (Produkt × Plattform), ref_price NICHT überschreiben
    if (productIds.length && biPlatforms.length) {
      // bulk: alle Kombinationen, die fehlen, einfügen – ohne ref_price zu setzen
      // Hinweis: product_refprice braucht UNIQUE(product_id, platform_id)
      const values: Array<any> = [];
      for (const pid of productIds) {
        for (const plat of biPlatforms) {
          values.push(pid, plat.platform_id);
        }
      }
      // Baue VALUES (?, ?) × N
      const tuples = Array(values.length / 2)
        .fill(0)
        .map(() => "(?, ?)")
        .join(",");

      await queryBi(
        `
        INSERT IGNORE INTO product_refprice (product_id, platform_id)
        VALUES ${tuples}
        `,
        values
      );
    }
    console.log(`Ensured product_refprice rows for all product × platform combos`);

    // 4) Wareneingänge → fact_shipping (ship_cost NIE überschreiben)
    const wawiOrders: WaWiOrderRow[] = await queryWawi(
      `
      SELECT b.BestellID,
             b.Bestelldatum,
             b.EingangZeitStempel,
             l.Name AS supplier_name
      FROM bestellung b
      JOIN lieferant l ON l.LiefID = b.LiefID
      WHERE b.Status = 'abgeschlossen'
      `
    );

    for (const o of wawiOrders) {
      await queryBi(
        `
        INSERT INTO fact_shipping (order_id, supplier_name, order_ts, arrival_ts, ship_cost)
        VALUES (?, ?, ?, ?, NULL)
        ON DUPLICATE KEY UPDATE
          supplier_name = VALUES(supplier_name),
          order_ts     = VALUES(order_ts),
          arrival_ts   = VALUES(arrival_ts),
          ship_cost    = COALESCE(fact_shipping.ship_cost, VALUES(ship_cost))
          -- behält bestehenden manuellen Wert (ROT); bleibt NULL, wenn noch keiner gesetzt wurde
        `,
        [o.BestellID, o.supplier_name, o.Bestelldatum, o.EingangZeitStempel]
      );
    }
    console.log(`Synced ${wawiOrders.length} shipping rows`);

    // 5) Verkäufe → fact_sales (act_price/act_cost NIE überschreiben)
    const wawiSales: WaWiSaleRow[] = await queryWawi(
      `
      SELECT VerkID, MatID, platform_id_sale, ts, Menge
      FROM verkauf
      `
    );

    for (const s of wawiSales) {
      const biPlatformId = platformIdMap.get(s.platform_id_sale);
      if (!biPlatformId) continue; // unbekannte Plattform, überspringen (oder loggen)

      await queryBi(
        `
        INSERT INTO fact_sales (sale_id, product_id, platform_id, date, quantity, act_price, act_cost)
        VALUES (?, ?, ?, ?, ?, NULL, NULL)
        ON DUPLICATE KEY UPDATE
          product_id  = VALUES(product_id),
          platform_id = VALUES(platform_id),
          date        = VALUES(date),
          quantity    = VALUES(quantity)
          -- act_price/act_cost absichtlich NICHT updaten (ROT)
        `,
        [s.VerkID, s.MatID, biPlatformId, s.ts, s.Menge]
      );
    }
    console.log(`Synced ${wawiSales.length} sales rows`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Synchronization completed successfully" }),
    };
  } catch (err: any) {
    console.error("Synchronization failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Synchronization failed", error: err?.message }),
    };
  }
};
