# Deploy demo to Altinity Playground environment

## Requirements

- A ClickHouse cluster running in Altinity Cloud
- The `tripdata.taxi_trips` and `tripdata.taxi_zones` tables

Note: The playground environment uses a different taxi data schema than the setup instructions in this repo.
Follow the [playground repo docs](https://github.com/Altinity/altinity-playground/blob/main/data/tripdata.md) to load
the tables referenced by this file.

## Add API endpoints

In the cluster explore page, go to the API endpoints tab and import the contents of
`api-endpoints-playground.json` as API endpoints (this will override existing endpoints):

```json
[
  {
    "endpoint": "/rush-hour",
    "method": "GET",
    "query": "SELECT countIf(hour(pickup_datetime) >= {start_time:UInt32} AND hour(pickup_datetime) < {end_time:UInt32}) as rush_hour_rides, count() as total_rides, round(rush_hour_rides * 100.0 / total_rides, 2) as percentage FROM tripdata.taxi_trips WHERE pickup_datetime >= '2023-01-01' AND pickup_datetime < '2024-01-01' FORMAT JSON"
  },
  {
    "endpoint": "/tips",
    "method": "GET",
    "query": "SELECT floor(trip_distance) as distance_mile, round(avg(tip_amount * 100.0 / (total_amount - tip_amount)), 2) as avg_tip_pct, count() as num_trips FROM tripdata.taxi_trips WHERE pickup_datetime >= '2023-01-01' AND pickup_datetime < '2024-01-01' AND trip_distance >= {min_distance:Float64} AND trip_distance < {max_distance:Float64} AND total_amount > tip_amount AND tip_amount >= 0 GROUP BY distance_mile ORDER BY distance_mile FORMAT JSON"
  },
  {
    "endpoint": "/routes",
    "method": "GET",
    "query": "SELECT pz.zone as pickup, dz.zone as dropoff, count() as trip_count, round(avg(trip_distance), 2) as avg_distance, round(avg(total_amount), 2) as avg_fare FROM tripdata.taxi_trips AS t JOIN tripdata.taxi_zones AS pz ON t.pickup_location_id = pz.location_id JOIN tripdata.taxi_zones AS dz ON t.dropoff_location_id = dz.location_id WHERE pickup_datetime >= '2023-01-01' AND pickup_datetime < '2024-01-01' AND pz.borough = {borough:String} AND t.pickup_location_id != t.dropoff_location_id GROUP BY pickup, dropoff ORDER BY trip_count DESC LIMIT {limit:UInt32} FORMAT JSON"
  }
]
```

Publish the cluster configuration to apply the change. Test the endpoints to ensure they work.

## Build static files

```
npm install
npm run build
```

This generates two files in `dist/`:
- `index.html`
- `assets/index.js`

## Upload files to ClickHouse

```
cd dist

clickhouse-client \
--host CLUSTER.ENVIRONMENT.altinity.cloud \
--secure --user admin --password "$CHPASSWORD" \
--query "INSERT INTO FUNCTION file('taxidemo/index.html', 'RawBLOB') SETTINGS engine_file_truncate_on_insert = 1 FORMAT RawBLOB" \
< index.html

clickhouse-client \
--host CLUSTER.ENVIRONMENT.altinity.cloud \
--secure --user admin --password "$CHPASSWORD" \
--query "INSERT INTO FUNCTION file('taxidemo/assets/index.js', 'RawBLOB') SETTINGS engine_file_truncate_on_insert = 1 FORMAT RawBLOB " \
< assets/index.js
```

## Add http handler settings file to ClickHouse

In the ACM, go to the settings tab on the cluster. Then, add a new setting with type config.d file and paste in the contents
of `taxidemo.xml` in this directory and name the settings file `taxidemo.xml`:

```xml
<?xml version="1.0"?>
<!--
  taxidemo — Demo of API endpoints on taxi data (tripdata database).

  Assets served:
    /taxidemo                 → file://taxidemo/index.html (taxidemo HTML)
    /taxidemo/assets/index.js → file://taxidemo/assets/index.js (taxidemo JS bundle)
-->
<clickhouse>
    <http_handlers>
        <rule name="taxidemo-html">
            <url>regex:^/taxidemo$</url>
            <methods>GET</methods>
            <handler>
                <type>static</type>
                <content_type>text/html; charset=UTF-8</content_type>
                <response_content>file://taxidemo/index.html</response_content>
            </handler>
        </rule>

        <rule name="taxidemo-assets-js">
            <url>regex:^/taxidemo/assets/index.js$</url>
            <methods>GET</methods>
            <handler>
                <type>static</type>
                <content_type>application/javascript; charset=UTF-8</content_type>
                <response_content>file://taxidemo/assets/index.js</response_content>
            </handler>
        </rule>

        <!-- <defaults/> anchored here — must be last across all config.d files. -->
        <defaults/>
    </http_handlers>
</clickhouse>
```

Save and then publish the configuration.

The demo should now be served at `cluster.environment.altinity.cloud/taxidemo`.
