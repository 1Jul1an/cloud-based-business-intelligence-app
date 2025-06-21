# Cloud-based Business Intelligence App

## Projektübersicht

Diese Anwendung entstand im Rahmen des Moduls **Mobile Business-Anwendungen (Teil 2)** an der Hochschule Harz (6. Semester, Bachelor Wirtschaftsinformatik). Ziel ist der Aufbau einer cloudbasierten Business-Intelligence-Plattform zur Entscheidungsunterstützung für ein Handelsunternehmen.

Die App ermöglicht die Analyse und Visualisierung von Verkaufs-, Versand- und Produktdaten aus einem angebundenen ERP-System. Die Architektur ist vollständig serverlos umgesetzt und auf Skalierbarkeit, Modularität und Erweiterbarkeit ausgelegt.

---

## Inhaltsziele

* Entwicklung einer cloudbasierten BI-Plattform mit mobiler Nutzbarkeit
* Echtzeitaggregation und Visualisierung betrieblicher KPIs
* Integration eines ERP-Backends (aus Projektteil 1)
* Erweiterbare Architektur für zusätzliche Business-Funktionalitäten
* Nutzung moderner Web- und Cloud-Technologien

---

## Technologie-Stack

| Bereich             | Technologie / Dienst                         |
| ------------------- | -------------------------------------------- |
| Frontend            | [Svelte](https://svelte.dev/), Chart.js      |
| Hosting             | AWS EC2 (Frontend, PM2)                      |
| Authentifizierung   | AWS Cognito (User Pools)                     |
| Backend             | Node.js + TypeScript, Serverless Framework   |
| Cloud Infrastruktur | AWS Lambda, API Gateway, IAM, VPC, RDS       |
| Datenbanken         | Amazon RDS (MariaDB)                         |
| Deployment          | Serverless CLI, Docker-basierter RDS-Zugriff |

---

## Kernfunktionen (KPI-Auswahl)

* Plattform Umsatz / Verkäufe
* Sales Verlauf nach Datum
* Bestseller Produkte
* Versandkosten Verlauf nach Datum
* Versandzeit Verlauf nach Datum
* Produktübersicht & Einzelverkaufsdaten

Diese Metriken werden über HTTP-Endpunkte aggregiert und im Frontend dynamisch dargestellt.

---

## Systemarchitektur

```
┌────────────────────────────┐
│      Nutzer (Mobile/Web)   │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│  Frontend (Svelte, EC2)    │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│   API Gateway (HTTP)       │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ Lambda-Funktionen (Node.js)│
└────────────┬───────────────┘
      ↓ queryWawi / queryBi
┌────────────────────────────┐
│ Amazon RDS (ERP + BI DBs)  │
└────────────────────────────┘
```

---

## Datenmodell (BI-Datenbank)

**Dimensionstabellen**:

* `dim_product`: Produkte, SKU, Name, Kategorie
* `dim_platform`: Plattformen (Amazon, Shopify, Faire etc.)

**Faktentabellen**:

* `fact_sales`: Verkaufsereignisse inkl. Zeitstempel
* `fact_shipping`: Versandkosten, Versandzeit, Anbieter
* `product_refprice`: Plattformbezogene Referenzpreise

Diese Struktur erlaubt performante Zeitreihen- und Plattformanalysen.

---

## Backend-Struktur

* **Architektur**: Domain-basierte Aufteilung (`/sales`, `/shipping`, `/products`, ...)
* **Functions**: Jeder Endpunkt als separate Lambda-Funktion (Single Responsibility)
* **Datenzugriff**: Direkte SQL-Zugriffe via `mysql2/promise`, kein ORM
* **Layer**: Gemeinsame Bibliotheken (z. B. `mysql2`) über Lambda Layer
* **VPC**: Private Subnetze für sicheren Zugriff auf RDS
* **Sync-Mechanismus**: Funktion `syncWawiToBi.ts` überführt ERP-Daten in das BI-Modell

---

## Frontend-Details (Svelte + Chart.js)

* **Reaktive UI**: KPI-Auswahl, Datumsfilterung, dynamisches Chart-Rendering
* **Datenanbindung**: zentrale `fetchKPI()`-Funktion, Integration mit Auth via Cognito
* **Fehlerhandling**: Ladeindikator, Exception-Catching, Leerdaten-Validierung
* **Diagrammtypen**: Linie, Balken, Kreis je nach KPI-Typ auswählbar
* **Erweiterbarkeit**: Strategiepattern für neue KPI-Visualisierungen vorbereitet

---

## Sicherheitskonzept

* Zugriffsschutz via AWS Cognito (User Authentifizierung)
* RDS über private Subnetze (VPC)
* IAM-Policy-Trennung für Deployment vs. Laufzeit
* Kein Public Access auf Datenbanken

---

## Entwicklung & Deployment

* **Backend**: Serverless CLI mit individueller Paketierung der Funktionen
* **Frontend**: Build via Vite, Deployment per SSH + PM2 auf EC2
* **Datenbankzugriff (Debug)**: über Docker + MariaDB-Client in isolierter Umgebung
* **Testing**: Funktionstests mit Testdaten, Fehler-Logging über `console.error`

---

## Ausblick & Erweiterbarkeit

* Zusätzliche Module: automatisiertes Reporting, Alert-Systeme
* UX-Verbesserungen: Benutzer-Dashboards, Favoriten, Export
* Backend-Optimierungen: S3/Athena-Integration für Big Data, RDS Proxy für Connection Mgmt.

---

## Lizenz & Hinweise

Dieses Projekt wurde im Rahmen eines Hochschulmoduls erstellt und dient ausschließlich zu Lehr- und Demonstrationszwecken.

---

## Kontakt

**Projektteam Business Intelligence App**

* **Julian B.** – Datenbank / Backend / Frontend / AWS Deployment / Dokumentation
  GitHub: [@1Jul1an](https://github.com/1Jul1an)

* **Omar K.** – Auth / Backend / AWS Deployment
  GitHub: [@Ok963](https://github.com/Ok963)

* **Ben V.** – AWS Deployment / Dokumentation
  GitHub: [@B3n-31](https://github.com/B3n-31)


## Screenshots

### KPI Dashboard (Use-Case 1) 
![KPI Dashboard](https://github.com/user-attachments/assets/b4f4b57e-97b8-49f9-9438-4dc82c62a672)
*Interaktives Dashboard mit Chart.js und dynamischen KPIs (Svelte-basiert).*


