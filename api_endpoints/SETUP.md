# NYC Taxi Dashboard - Complete Setup Guide 🚕

Getting your interactive taxi data dashboard up and running quickly

## Prerequisites

- Docker installed on your local machine  
- An Altinity.Cloud® account (free trial available at [altinity.cloud](https://docs.altinity.com/altinitycloud/quickstartguide/createaccount/))

## Step 0: Sign up for an Altinity.Cloud account

If you don't have one already, you can sign up for a free trial account. [See the Altinity docs site for the details](https://docs.altinity.com/altinitycloud/quickstartguide/createaccount/).

## Step 1: Create a ClickHouse® Cluster in Altinity Cloud Manager

1. Log into Altinity Cloud Manager (ACM).
2. Go to the Clusters view and click the **LAUNCH CLUSTER** button at the top of the page. (Complete instructions are on the [Creating a New Cluster page](https://docs.altinity.com/altinitycloud/quickstartguide/clusterfirsttime/).)
3. Give your new cluster a name and click the **LAUNCH** button. 
4. Wait for your cluster to provision (~5 minutes).

## Step 2: Create the database and tables, then load the data

1. In the ACM, go to your cluster, click the **EXPLORE** button, then go to the [Query tab](https://docs.altinity.com/altinitycloud/userguide/cluster-explorer/query-tab/).
2. Copy and paste these commands to create the new database, a table in that database, then load that table with data: 

```sql
-- Create database  
CREATE DATABASE IF NOT EXISTS maddie ON CLUSTER '{cluster}';
```

```sql
       -- Create table  
CREATE TABLE maddie.taxi_local ON CLUSTER '{cluster}'
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
ENGINE = ReplicatedMergeTree('/clickhouse/{cluster}/tables/{database}/{table}', '{replica}')
ORDER BY tuple()
SETTINGS index_granularity = 8192;

-- Create the table for the boroughs and zone names
CREATE TABLE maddie.taxi_zones ON CLUSTER '{cluster}'
(
   `LocationID` Int32,
   `Borough` String,
   `Zone` String,
   `service_zone` String
)
   ENGINE = ReplicatedMergeTree('/clickhouse/{cluster}/tables/{database}/{table}', '{replica}')
ORDER BY LocationID  
SETTINGS index_granularity = 8192;
```

3. Import the data

Run these statements to load the tables: 

```sql
-- Load August-October 2025 data from Parquet files  
INSERT INTO maddie.taxi_local   
SELECT * FROM url('https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-{08,09,10}.parquet',  
    'Parquet'  
);

-- Load mapping from location IDs to borough names into the new table   
INSERT INTO maddie.taxi_zones
SELECT * FROM url(
        'https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv',
        'CSVWithNames'
              );
```

4. Verify that the data loaded:

```sql
SELECT count() FROM maddie.taxi_local;
```

The table should have roughly 12.25 million rows.

```sql
SELECT count() FROM maddie.taxi_zones;
```

As of this writing, the table has 265 rows. 

## Step 3: Create API Endpoints

1. In the ACM, go to your cluster and go to the [API Endpoints tab](https://docs.altinity.com/altinitycloud/userguide/cluster-explorer/api-endpoints-tab/). 
2. Click the **IMPORT** button at the top.
3. Click the **UPLOAD JSON FILE** button at the top and upload the `api-endpoints.json` file from this package.
4. Wait ~30 seconds for the cluster configuration to update.
5. Verify that the endpoints are defined (you should see three: `/rush-hour`, `/tips`, `/routes`).

## Step 4: Configure the Dashboard

1. Get your cluster connection details:  
     
   - In the ACM, go to your cluster and click [the Connection Details link](https://docs.altinity.com/altinitycloud/userguide/configuring-a-cluster/configuring-connections/).
   - Copy the HTTPS endpoint URL (it'll be something like `https://username:password@your-cluster.altinity.cloud:8443`).  
   - Note your username and password (if your username is `admin`, you really should [create a new user](https://docs.altinity.com/altinitycloud/userguide/configuring-a-cluster/managing-users/) with limited privileges for security purposes).

2. Edit `vite.config.js` in the project root:

    - Find the line `target: 'https://mycluster.myenv.altinity.cloud:8443'`   
      and replace the value with your cluster URL *without `userid:password`*. We'll define those values in an `.env` file next.

3. Create an `.env` file from the example file:  
     
```sql
   # Copy the example file  
   cp .env.example .env  
```

4. Edit `.env` and add your credentials:  

```bash
   VITE_CLICKHOUSE_USERNAME=your_username_here  
   VITE_CLICKHOUSE_PASSWORD=your_password_here  
```

**NOTE**: The included `.gitignore` file includes `.env`, so you don't have to worry about commiting it accidentally.

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
  `curl 'https://USERNAME:PASSWORD@your-cluster:8443/rush-hour?start_time=16&end_time=20'`

### "Port 5173 in use"

You can try the brute force approach and just kill the process:

```bash
lsof -i :5173  
kill -9 <PID>
```

Or use a different port. For example, if you want to use port 3000, you can change `docker-compose.yml`: 

```bash
    ports:
      - "3000:5173"
```

If you're running this with local Node.js, you can specify the port on the command line: 

```bash
npm run dev -- --port 3000
```

### Data doesn't update when sliders move

- Check Network tab in DevTools - you should see new requests  
- Verify parameter names match between SQL and JavaScript

## Other things you might want to try

### Customize the queries:

- Edit the API endpoint SQL in ACM  
- Modify `src/taxi-dashboard.jsx` to change visualizations  
- Add more endpoints for additional insights!

### Add more data:

- Load additional months of taxi data  
- Try other NYC TLC datasets (green taxis, FHV, etc.)

### Extend the dashboard:

- Add time series charts  
- Create geographic visualizations  
- Build drill-down views

## File Checklist

Your package should include:

```text
├── .env.example - Sample credentials file 
├── .gitignore - Don't commit .env, ./node_modules and other files
├── AGENTS.md - Outlines the AI-guided development process 
├── api-endpoints.json - API endpoint definitions 
├── docker-compose.yml - Docker setup 
├── docs - Various graphics:
│   ├── clock.png
│   ├── dollar_sign.png
│   ├── hottest_routes.png
│   ├── map_pin.png
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
