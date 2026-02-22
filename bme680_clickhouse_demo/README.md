# Logging BME680 Sensor Data using ClickHouse Endpoints

This project is a set of demos that show you how to use single-board computers (SBCs) to log temperature, humidity, and pressure data from a BME680 sensor to a ClickHouse endpoint for real-time IoT analytics.

## Overview

This project demonstrates how to:

- Set up a ClickHouse database, table, and an endpoint for an `INSERT` statement
- Initialize an SBC and a BME sensor
- Read environmental data from a BME680 sensor
- Send that data to ClickHouse via an authenticated `POST` request

Perfect for building IoT dashboards, environmental monitoring systems, or learning about sensor integration with analytical databases.

## ClickHouse Table Schema

The examples here write data from the BME680 sensor to a ClickHouse database with this schema: 

```sql
CREATE TABLE maddie.sensor_data ON CLUSTER '{cluster}'
(
   time_stamp DateTime64(3),
   temp Float32,
   humidity Float32,
   pressure Float32,
   sensor String
)
ENGINE = ReplicatedMergeTree('/clickhouse/{cluster}/tables/maddie/sensor_data', '{replica}')
ORDER BY tuple()
SETTINGS index_granularity = 8192;
```

## Subprojects

There are two versions of the code, each of which is a complete example: 

* [The Raspberry Pi version](raspberry_pi/README.md) - Runs on a Raspberry Pi, a Linux-based SBC.  
* [The Raspberry Pi Pico version](raspberry_pi_pico/README.md) - Runs on a Raspberry Pi Pico, a microcontroller that runs [MicroPython](https://micropython.org/).

## Project Structure
```
├── README.md - this file
├── images
│   ├── pico_and_bme680.png - Pinout diagram for the Pico
│   └── raspberry_pi_and_bme680.png - Pinout diagram for the Raspberry Pi
│
├── raspberry_pi - Using a Raspberry Pi to log data from a BME680 to a ClickHouse endpoint 
│   ├── AGENTS.md - How this code was developed with AI
│   ├── .env.example - Sample environment configuration file
│   ├── config.json.example - Sample configuration file
│   ├── jetson-requirements.txt - Python requirements file with old version numbers for the Jetson Nano
│   ├── README.md - The README for this sub-project
│   ├── requirements.txt - Python requirements file with up-to-date versions
│   ├── sensor_to_clickhouse.py - The code that reads the sensor and writes data to ClickHouse
│   ├── SETUP.md - How to set up the hardware and software
│   └── test_bme680.py - A test script to make sure the BME680 is working
│
└── raspberry_pi_pico - Using a Raspberry Pi Pico to log data from a BME680 to a ClickHouse endpoint 
    ├── AGENTS.md - How this code was developed with AI
    ├── main.py - The code that reads the sensor and writes data to ClickHouse
    ├── README.md - The README for this sub-project
    └── SETUP.md - How to set up the hardware and software
```

## Blog Post

This demo accompanies our blog post: [Using Altinity.Cloud to Log Sensor Data with ClickHouse Endpoints](#)

## Community

This project is a demo created by Altinity to accompany the blog post [Using Altinity.Cloud to Log Sensor Data with ClickHouse Endpoints](#). The best way to reach us or ask questions about the code is:

* Join [the Altinity Slack](https://altinity.com/slack) - Chat with the developers and other users 
* Log [an issue on GitHub](https://github.com/Altinity/examples/issues) - Ask questions, log bugs and feature requests

## Contributing

We welcome contributions from the community! If you encounter issues or have improvements to suggest, please log an issue or submit a PR.

## Legal

All code, unless specified otherwise, is licensed under the Apache-2.0 license. Copyright ®2026 Altinity, Inc. Altinity.Cloud®, and Altinity Stable® are registered trademarks of Altinity, Inc. ClickHouse® is a registered trademark of ClickHouse, Inc.; Altinity is not affiliated with or associated with ClickHouse, Inc. Kubernetes, MySQL, and PostgreSQL are trademarks and property of their respective owners.
