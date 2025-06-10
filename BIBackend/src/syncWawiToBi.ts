// src/syncWawiToBi.ts
import { queryWawi, queryBi } from './db';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const syncData: APIGatewayProxyHandler = async (event) => {
    try {
        console.log('Starting WaWi to BI data synchronization...');

        // 1. Synchronisiere dim_product
        // Annahme: tabelle_material in WaWi hat Produktinformationen
        const wawiProducts = await queryWawi('SELECT MatID, Name, SKU, EKPreis FROM tabelle_material'); // EKPreis könnte ref_cost sein
        for (const prod of wawiProducts) {
            await queryBi(
                `INSERT INTO dim_product (product_id, sku, name, ref_cost)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE sku = VALUES(sku), name = VALUES(name), ref_cost = VALUES(ref_cost)`,
                [prod.MatID, prod.SKU, prod.Name, prod.EKPreis]
            );
        }
        console.log(`Synchronized ${wawiProducts.length} products.`);

        // 2. Synchronisiere fact_shipping (Versanddaten)
        // Holen wir Bestellungen, die noch nicht synchronisiert wurden oder aktualisiert wurden
        // Annahme: WaWi bestellung.BestellID = fact_shipping.order_id
        // Und wir brauchen LiefID, um supplier_name zu bekommen
        const wawiOrders = await queryWawi(`
            SELECT
                b.BestellID,
                b.Bestelldatum,
                b.EingangZeitStempel,
                l.Name AS supplier_name,
                b.status,
                b.LiefID -- Brauchen wir LiefID für individuelle Versandkostenregeln?
            FROM bestellung b
            JOIN tabelle_lieferant l ON b.LiefID = l.LieferantID
            WHERE b.status = 'abgeschlossen' -- Nur abgeschlossene Bestellungen synchronisieren
            ORDER BY b.Bestelldatum ASC
        `);

        for (const order of wawiOrders) {
            // Berechne Versandkosten hier oder über eine Hilfsfunktion
            const shippingCost = calculateShippingCost(order.BestellID, order.LiefID, /* weitere Parameter wie Gewicht/Volumen */); // TODO: Implement calculateShippingCost

            await queryBi(
                `INSERT INTO fact_shipping (shop_id, supplier_name, order_id, order_ts, arrival_ts, ship_cost)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    supplier_name = VALUES(supplier_name),
                    order_ts = VALUES(order_ts),
                    arrival_ts = VALUES(arrival_ts),
                    ship_cost = VALUES(ship_cost)`,
                [1, order.supplier_name, order.BestellID, order.Bestelldatum, order.EingangZeitStempel, shippingCost] // shop_id ist hardcoded als 1, anpassen falls dynamisch
            );
        }
        console.log(`Synchronized ${wawiOrders.length} shipping facts.`);


        // 3. Synchronisiere fact_sales (Verkaufsdaten)
        // Dies ist komplexer, da fact_sales product_id, platform_id, quantity, sell_price, ref_cost benötigt.
        // Die Herkunft dieser Daten aus der WaWi ist im Schema nicht explizit für "Verkauf" aufgeführt.
        // Annahme: Es gibt eine WaWi-Tabelle 'tabelle_verkauf' oder 'bestellpositionen_kunde'
        // Für diesen Beispielcode muss ich eine Annahme treffen.
        // Wenn du eine 'tabelle_verkauf' hast, die so aussieht: VerkaufID, MatID, PlatID, Menge, Preis
        // Dann könnte der SQL-Query so aussehen:
        const wawiSales = await queryWawi(`
            SELECT
                tv.VerkaufID AS sale_id,
                tv.MatID AS product_id,
                tv.PlatID AS platform_id,
                tv.Menge AS quantity,
                tv.Preis AS sell_price,
                b.Bestelldatum AS sale_date -- Annahme: Verkaufsdatum kommt aus der BestellTabelle
            FROM tabelle_verkauf tv
            JOIN bestellung b ON tv.BestellID = b.BestellID -- Annahme: Verkauf ist mit Bestellung verknüpft
        `);

        for (const sale of wawiSales) {
            // ref_cost aus dim_product holen
            const productDim = await queryBi('SELECT ref_cost FROM dim_product WHERE product_id = ?', [sale.product_id]);
            const refCost = productDim.length > 0 ? productDim[0].ref_cost : 0; // Fallback auf 0

            await queryBi(
                `INSERT INTO fact_sales (sale_id, product_id, platform_id, date, quantity, sell_price, ref_cost)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    product_id = VALUES(product_id),
                    platform_id = VALUES(platform_id),
                    date = VALUES(date),
                    quantity = VALUES(quantity),
                    sell_price = VALUES(sell_price),
                    ref_cost = VALUES(ref_cost)`,
                [sale.sale_id, sale.product_id, sale.platform_id, sale.sale_date, sale.quantity, sale.sell_price, refCost]
            );
        }
        console.log(`Synchronized ${wawiSales.length} sales facts.`);


        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Synchronization completed successfully!' }),
        };
    } catch (error) {
        console.error('Synchronization failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Synchronization failed', error: error.message }),
        };
    }
};

// Hilfsfunktion zur Versandkostenberechnung (Platzhalter)
function calculateShippingCost(orderId: number, supplierId: number /*, ... weitere Parameter für Berechnung */): number {
    // Hier müsste eine Logik rein, die die tatsächlichen Versandkosten berechnet.
    // Das könnte basieren auf:
    // - Lieferant (supplierId)
    // - Gewicht/Volumen der Bestellung (dazu müssten wir die Bestellpositionen aus der WaWi holen)
    // - Versandart
    // - Zieladresse
    // Da wir diese Details nicht haben, ist dies ein PLAHTZALTER.
    // Beispiel: Feste Kosten pro Lieferant oder pro Bestellung
    if (supplierId === 1) return 4.99; // Beispiel für Lieferant 1
    if (supplierId === 3) return 7.99; // Beispiel für Lieferant 3
    return 5.00; // Standardkosten
}

// Hilfsfunktion zur Gewinnberechnung (wird in den Endpunkten genutzt, nicht hier in der Sync)
// Gewinn = (Verkaufspreis - Referenzkosten) * Menge
// Diese Logik gehört in den `sales` Endpunkt, wenn er die Daten abruft.