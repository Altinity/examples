# NYC Taxi Dashboard - Complete Setup Guide

Get your interactive taxi data dashboard running in 15 minutes!

## Prerequisites

- Docker installed on your local machine  
- An Altinity.Cloud® account (free trial available at [altinity.cloud](https://docs.altinity.com/altinitycloud/quickstartguide/createaccount/))

## Step 0: Sign up for an Altinity.Cloud account

If you don't have one already, you can sign up for a free trial account. [See the Altinity docs site for the details.](https://docs.altinity.com/altinitycloud/quickstartguide/createaccount/)

## Step 1: Create a ClickHouse® Cluster in Altinity Cloud Manager

**Rewrite this for the quick cluster wizard**

1. Log into Altinity Cloud Manager (ACM)  
2. Click [**Launch Cluster**](https://docs.altinity.com/altinitycloud/quickstartguide/clusterfirsttime/)  
3. Choose your configuration:  
   - **Name:** `taxi-dashboard` (or whatever you prefer)  
   - **Cloud:** Your choice (AWS/GCP/Azure)  
   - **Region:** Choose closest to you  
   - **Size:** Small/Medium is fine for this demo  
4. Click **"Create"** and wait for cluster to provision (~5 minutes)

## Step 2: Load NYC Taxi Data

1. In ACM, go to your cluster → [**Cluster Explorer** → **Query** tab](https://docs.altinity.com/altinitycloud/userguide/cluster-explorer/query-tab/)  
2. Copy and paste this entire SQL statement:

```sql
-- Create database  
CREATE DATABASE IF NOT EXISTS maddie;

-- Create table  
CREATE TABLE maddie.taxi_local
(
    `VendorID` Nullable(Int32),
    `tpep_pickup_datetime` Nullable(DateTime64(6)),
    `tpep_dropoff_datetime` Nullable(DateTime64(6)),
    `passenger_count` Nullable(Int64),
    `trip_distance` Nullable(Float64),
    `RatecodeID` Nullable(Int64),
    `store_and_fwd_flag` Nullable(String),
    `PULocationID` Nullable(Int32),
    `DOLocationID` Nullable(Int32),
    `payment_type` Nullable(Int64),
    `fare_amount` Nullable(Float64),
    `extra` Nullable(Float64),
    `mta_tax` Nullable(Float64),
    `tip_amount` Nullable(Float64),
    `tolls_amount` Nullable(Float64),
    `improvement_surcharge` Nullable(Float64),
    `total_amount` Nullable(Float64),
    `congestion_surcharge` Nullable(Float64),
    `Airport_fee` Nullable(Float64),
    `cbd_congestion_fee` Nullable(Float64)
)
ENGINE = MergeTree
ORDER BY tuple()
SETTINGS index_granularity = 8192;

-- Load August-October 2025 data from Parquet files  
INSERT INTO maddie.taxi_local   
SELECT * FROM url('https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-{08,09,10}.parquet',  
    'Parquet'  
);
```

3. Click **"Run"** and wait for the data to load (~2-5 minutes depending on cluster size). 

**NOTE**: if you're running these statements in a cluster without replication, you'll get a warning message because you're not using the ReplicatedMergeTree engine. Ignore that message and proceed. (The Altinity Cloud Manager can convert your table's engine to from MergeTree to ReplicatedMergeTree; see the aptly named page [Converting a Table's Engine to ReplicatedMergeTree](https://docs.altinity.com/altinitycloud/administratorguide/backing-up-and-restoring-data/converting-a-tables-engine-to-rmt/) for the details.)  

4. Verify that the data loaded:

```sql
SELECT count() FROM maddie.taxi_local;
```

The table should have roughly 12.25 million rows.

5. We also need the `demo.taxi_zones` table, which contains borough and zone names. You can load it with:

```sql
-- Create the table for the boroughs and zone names
CREATE TABLE demo.taxi_zones
(  
    `LocationID` Int32,  
    `Borough` String,  
    `Zone` String,  
    `service_zone` String  
)  
ENGINE = MergeTree
ORDER BY LocationID  
SETTINGS index_granularity = 8192;

-- Load mapping from location IDs to borough names into the new table   
INSERT INTO demo.taxi_zones
SELECT * FROM url(
    'https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv',
    'CSVWithNames'
);
```

6. Verify that the data loaded: 

```sql
SELECT count() FROM demo.taxi_zones;
```

The table should have 265 rows. 

## Step 3: Create API Endpoints

1. In ACM, go to your cluster → **"Cluster Explorer"** → **"API Endpoints"** tab  
2. Click the **Import** button at the top  
3. Click the **UPLOAD JSON FILE** button at the top and upload the `api-endpoints.json` file from this package  
4. Wait ~30 seconds for the cluster configuration to update  
5. Verify endpoints are active (you should see three: `/rush-hour`, `/tips`, `/routes`)

## Step 4: Configure the Dashboard

1. Get your cluster connection details:  
     
   - In the ACM, go to your [cluster → **"Connection Details"**](https://docs.altinity.com/altinitycloud/userguide/configuring-a-cluster/configuring-connections/)  
   - Copy the HTTPS endpoint URL (it'll be something like: `https://username:password@your-cluster.altinity.cloud:8443`)  
   - Note your username and password (if your username is `admin`, you should [create a new user](https://docs.altinity.com/altinitycloud/userguide/configuring-a-cluster/managing-users/) with limited privileges)
   - 

2. Edit `vite.config.js` in the project root:

    - Find the line   
      `target: 'https://mycluster.myenv.altinity.cloud:8443'`   
      and replace the value with your cluster URL. The URL should not include `userid:password`; we'll define those values in an `.env` file.

3. Create an `.env` file from the example file:  
     
```sql
   # Copy the example file  
   cp .env.example .env  
```

4. Edit `.env` and add your credentials:  

```bash
   VITE_CLICKHOUSE_USERNAME=should_not_be_admin  
   VITE_CLICKHOUSE_PASSWORD=your_password_here  
```

**Important:** Never commit your `.env` file to git! (The included `.gitignore` file includes `.env`.)

## Step 5: Run the Dashboard

To run the project in Docker: 

```bash
# Start the dashboard  
docker compose up -d
```

Or if you prefer local Node.js:

```bash
npm install  
npm run dev
```

Open your browser to: http://localhost:5173

You should see:

- **Rush Hour Analysis** with cyan theme and pie chart  
- **Tip Distribution** with gold theme and bar chart  
- **Hottest Routes** with green theme and ranked list

Work with the controls on the page and watch the data update in real-time! Every change to the UI causes the app to call an API Endpoint in your ClickHouse cluster. 

## Troubleshooting

### No data showing

- Check browser console for errors  
- Verify API endpoints are created (takes ~30 seconds after creation)  
- Test endpoints with curl:  
  `curl 'https://admin:PASSWORD@your-cluster:8443/routes?limit=10' --insecure`

### Certificate errors

- The Vite proxy (in `vite.config.js`) should handle self-signed certs  
- Make sure you updated the proxy target URL to match your cluster

### "Port 5173 in use"

Kill the process:

```bash
lsof -i :5173  
kill -9 <PID>
```

Or use a different port:

```bash
npm run dev -- --port 3000
```

### Data doesn't update when sliders move

- Check Network tab in DevTools - you should see new requests  
- Verify parameter names match between SQL and JavaScript

## Other things you might want to try

**Customize the queries:**

- Edit the API endpoint SQL in ACM  
- Modify `src/taxi-dashboard.jsx` to change visualizations  
- Add more endpoints for additional insights!

**Add more data:**

- Load additional months of taxi data  
- Try other NYC TLC datasets (green taxis, FHV, etc.)

**Extend the dashboard:**

- Add time series charts  
- Create geographic visualizations  
- Build drill-down views

## File Checklist

Your package should include:

```text
├── api-endpoints.json - API endpoint definitions 
├── docker-compose.yml - Docker setup 
├── docs - Various graphics:
│   ├── clock.png
│   ├── dollar_sign.png
│   ├── hottest_routes.png
│   ├── mappin.png
│   ├── rush_hour_analysis.png
│   └── tip_destination_by_distance.png
├── index.html - HTML template  
├── package.json - Dependencies  
├── README.md - Detailed documentation
├── SETUP.md - This file  
├── src
│   ├── App.jsx - App wrapper  
│   ├── main.jsx - Entry point  
│   └── taxi-dashboard.jsx - Main React component 
└── vite.config.js - Dev server config with proxy 
```

## Have fun! 🚕⚡
