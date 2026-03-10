Retail Pricing Feed System

Built this full-stack web app as part of a case study. The idea was to create a web app where store managers can upload CSV pricing feeds and analysts can search and edit records across stores.

Stack: FastAPI + Angular 21 + PostgreSQL, all running locally via Docker.

🔗 Repo: https://github.com/Ni-Pun/retail-pricing-feed

What it does:
Upload CSV files containing store pricing data (Store ID, SKU, Product Name, Price, Date)
Tracks upload progress in real time — shows QUEUED → PROCESSING → DONE
Search records by store, SKU, product name, price range, date range
Edit any record inline and save changes
Every edit is logged in an audit table — who changed what and when

Tech Stack:

Layer	What I used	Why:
Frontend	Angular 21 + NgRx Signals + ng-zorro-antd	I work with Angular daily so this was the natural choice. ng-zorro gave me table, upload and progress components out of the box
Backend	Python 3.12 + FastAPI	Async, fast, and the auto-generated Swagger UI at /docs is genuinely useful during development
Database	PostgreSQL 16 via Docker	Needed proper ACID transactions and the ON CONFLICT DO UPDATE upsert feature for idempotent CSV uploads
Task Processing	FastAPI BackgroundTasks	Good enough for the demo. In production I'd like to use Celery workers so large CSVs don't block the API process
File Storage	Local disk (./uploads/)	Replaced S3 to keep local setup simple. Same logic, just a different destination

Context Diagram :
                        ┌─────────────────────────────────┐
                        │   Retail Pricing Feed System     │
                        │                                  │
  Store Manager ───────▶│  • Upload CSV pricing feeds      │
  Price Analyst ───────▶│  • Search pricing records        │◀──── Identity Provider
  System Admin  ───────▶│  • Edit / save record changes    │      (OAuth 2.0 / OIDC)
                        │  • Track upload history          │
                        └──────────────┬──────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   ▼
             Cloud Storage        PostgreSQL          Observability
             (CSV Archive)        (Pricing DB)        (Logs/Metrics)

Actors:
Store Manager — uploads CSV feeds for their store, views own data
Price Analyst — searches and edits records across all stores
System Admin — manages users and views audit logs

External systems (production):
Identity Provider (Azure AD / Okta) for SSO
S3 / Azure Blob for raw CSV archival
Datadog / Grafana for monitoring

Architecture:
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│              Angular 21 SPA (localhost:4200)             │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────┐
│                     API Layer                            │
│              FastAPI (localhost:8000)                    │
│         /api/v1/uploads    /api/v1/pricing               │
└──────┬──────────────────────────────────┬───────────────┘
       │                                  │
┌──────▼──────┐                  ┌────────▼────────┐
│  Background  │                  │   PostgreSQL     │
│   Task       │                  │   (Docker)       │
│ (CSV Parser) │─────────────────▶│   port 5432      │
└──────┬───────┘                  └─────────────────┘
       │
┌──────▼───────┐
│ Local Upload  │
│   Storage     │
│ (./uploads/)  │
└──────────────┘

Key Design Decisions:

Async CSV processing:
I didn't want the upload to time out on large files so the CSV is saved to disk immediately, HTTP responds with a job ID, and a background task handles the actual processing. The frontend polls /uploads/{id}/status every 2 seconds using RxJS interval + takeWhile which stops automatically once the job finishes.

Idempotent uploads:
The pricing_records table has a unique constraint on (store_id, sku, price_date). Inserts use ON CONFLICT DO UPDATE so uploading the same CSV twice just updates the existing records and bumps the version — no duplicates, no errors. Store managers re-upload corrected feeds all the time so this was important to get right.

Optimistic locking on edits:
Every record has a version field. When saving an edit, the frontend sends the version it loaded. If someone else edited the same record in the meantime, the versions won't match and the API returns 409. The user gets told to reload and retry. I went with optimistic over pessimistic locking because with 500+ concurrent analysts, locking rows would cause queuing and timeouts.

Audit trail:
Every PUT on a pricing record writes a row to pricing_audit with old values, new values, actor and timestamp — all in the same DB transaction. Useful for accountability and debugging unexpected price changes.

Formula injection protection:
Rejected product names that start with =, +, -, @, |. These characters can turn into executable formulas if someone opens an export in Excel. Small thing but worth doing.

Assumptions:
CSV columns are store_id, sku, product_name, price, date — currency is optional and defaults to USD
One record = one unique store_id + sku + date combination
Auth is open for the demo — in production this would be JWT from Azure AD with store-level row security
Local disk replaces S3, BackgroundTasks replaces Celery — same logic, simpler setup
Search using PostgreSQL ILIKE is fine for demo. At 150M+ records this would need Elasticsearch

Non-Functional Requirements (considered):

NFR	How I addressed it:
Performance	Indexed columns on store_id, sku, price_date. Batch inserts of 500 rows. For real scale, Elasticsearch for search
Scalability	Stateless FastAPI — can run multiple instances behind a load balancer. Batch CSV processing keeps memory constant regardless of file size
Data integrity	ACID transactions, unique constraint prevents duplicates, optimistic locking prevents concurrent overwrites
Security	CORS restricted to localhost:4200, formula injection validation, in production: OAuth 2.0 PKCE + WAF
Auditability	Full edit history in pricing_audit table
Availability	Production design uses multi-AZ Kubernetes + managed PostgreSQL with auto-failover. Local demo is single instance

Local Setup:

Prerequisites:
Python 3.12
Node.js 20+
Docker Desktop
Git
1. Clone
git clone https://github.com/Ni-Pun/retail-pricing-feed.git
cd retail-pricing-feed
2. Start the database
docker run -d \
  --name pricing-postgres \
  -e POSTGRES_DB=pricing_db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -p 5432:5432 \
  postgres:16-alpine
3. Start the backend
cd backend
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
API docs at http://localhost:8000/docs

4. Start the frontend
cd frontend/pricing-feed
npm install
ng serve
App at http://localhost:4200

5. Test it

Create test_prices.csv:
store_id,sku,product_name,price,date,currency
STORE-001,SKU-A001,Organic Whole Milk 1L,2.99,2024-01-15,USD
STORE-001,SKU-A002,Orange Juice 500ml,3.49,2024-01-15,USD
STORE-042,SKU-B001,Basmati Rice 5kg,8.99,2024-01-14,GBP
STORE-117,SKU-C001,Sparkling Water 1.5L,1.89,2024-01-13,EUR
Open http://localhost:4200
Enter Store ID → upload the CSV → watch progress bar
Click Search to see the records
Click Edit on any row → change the price → Save
Version number should bump from v1 to v2

API Reference:

Method	Endpoint	Description:
POST	/api/v1/uploads/	Upload CSV (multipart/form-data)
GET	/api/v1/uploads/{id}/status	Poll upload status
GET	/api/v1/pricing/	Search records
PUT	/api/v1/pricing/{id}	Update a record
GET	/api/v1/pricing/{id}/audit	Edit history for a record
GET	/health	Health check
