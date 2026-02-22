#!/usr/bin/env python3
"""
BME680 Sensor Data Logger to ClickHouse API Endpoint
Reads temperature, humidity, and pressure data and POSTs to REST endpoint
"""

import bme680
import requests
import time
import json
import os
import sys
from datetime import datetime, timezone
from base64 import b64encode
from dotenv import load_dotenv
import urllib3

# Load environment variables from .env file
load_dotenv()

class SensorLogger:
    def __init__(self, config_file='config.json'):
        """Initialize the sensor logger with configuration"""

        # Load configuration
        try:
            with open(config_file, 'r') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            print(f"Error: Configuration file '{config_file}' not found!")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"Error: Configuration file '{config_file}' is not valid JSON!")
            sys.exit(1)

        # Get credentials from environment variables
        self.username = os.getenv('CLICKHOUSE_USERNAME')
        self.password = os.getenv('CLICKHOUSE_PASSWORD')

        if not self.username or not self.password:
            print("Error: CLICKHOUSE_USERNAME and CLICKHOUSE_PASSWORD must be set!")
            print("Create a .env file with these variables or export them.")
            sys.exit(1)

        # Create Basic Auth header
        credentials = f"{self.username}:{self.password}"
        encoded_credentials = b64encode(credentials.encode()).decode()
        self.auth_header = f"Basic {encoded_credentials}"

        # Initialize BME680 sensor
        try:
            self.sensor = bme680.BME680(bme680.I2C_ADDR_PRIMARY)
        except (RuntimeError, IOError):
            try:
                self.sensor = bme680.BME680(bme680.I2C_ADDR_SECONDARY)
            except (RuntimeError, IOError):
                print("Error: Could not find BME680 sensor!")
                print("Check wiring and run 'i2cdetect -y 1' to verify.")
                sys.exit(1)

        # Configure sensor oversampling and filter
        self.sensor.set_humidity_oversample(bme680.OS_2X)
        self.sensor.set_pressure_oversample(bme680.OS_4X)
        self.sensor.set_temperature_oversample(bme680.OS_8X)
        self.sensor.set_filter(bme680.FILTER_SIZE_3)

        if self.config.get('log_to_console', True):
            print("Sensor Logger initialized successfully!")
            print(f"Endpoint: {self.config['endpoint_url']}")
            print(f"Sample interval: {self.config['sample_interval']} seconds")
            print(f"Sensor: {self.config.get('sensor_name', 'unknown')}")
            print(f"Temperature offset: {self.config.get('temp_adjustment', 0.0)}")

    def read_sensor(self):
        """Read data from BME680 sensor with temperature calibration"""
        if self.sensor.get_sensor_data():
            # Apply temperature offset to compensate for sensor self-heating
            calibrated_temp = self.sensor.data.temperature + self.config.get('temp_adjustment', 0.0)

            return {
                'temperature': round(calibrated_temp, 2),
                'humidity': round(self.sensor.data.humidity, 2),
                'pressure': round(self.sensor.data.pressure, 2),
                'raw_temperature': round(self.sensor.data.temperature, 2)  # Keep raw for debugging
            }
        return None

    def send_to_api(self, sensor_data):
        """Send sensor data to ClickHouse API endpoint via POST"""

        # Get current timestamp
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

        # Build POST body as form data (not JSON)
        payload = {
            'time_stamp': timestamp,
            'temp': str(sensor_data['temperature']),
            'humidity': str(sensor_data['humidity']),
            'pressure': str(sensor_data['pressure']),
            'sensor': self.config.get('sensor_name', 'unknown')
        }

        # Prepare headers - note: NOT application/json
        headers = {
            'Authorization': self.auth_header,
            'Content-Type': 'application/x-www-form-urlencoded'  # Important!
        }

        try:
            # Send as form data (application/x-www-form-urlencoded)
            response = requests.post(
                self.config['endpoint_url'],
                params=payload,  # 'data' not 'json' - sends as form data
                headers=headers,
                timeout=10
            )

            response.raise_for_status()

            if self.config.get('log_to_console', True):
                print(f"✓ Data sent successfully at {timestamp}")
                print(f"  Temp: {sensor_data['temperature']}°C (raw: {sensor_data['raw_temperature']}°C), "
                      f"Humidity: {sensor_data['humidity']}%, "
                      f"Pressure: {sensor_data['pressure']} hPa")

            return True

        except requests.exceptions.RequestException as e:
            print(f"✗ Error sending data: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"  Status code: {e.response.status_code}")
                print(f"  Response: {e.response.text}")
            return False

    def run(self):
        """Main loop - read sensor and send data at configured interval"""
        print("\nStarting sensor data collection...")
        print("Press Ctrl+C to stop\n")

        try:
            while True:
                # Read sensor data
                sensor_data = self.read_sensor()

                if sensor_data:
                    # Send to API
                    self.send_to_api(sensor_data)
                else:
                    print("✗ Failed to read sensor data")

                # Wait for next sample
                time.sleep(self.config['sample_interval'])

        except KeyboardInterrupt:
            print("\n\nStopping sensor logger...")
            print("Goodbye!")

def main():
    """Entry point"""
    logger = SensorLogger()
    logger.run()

if __name__ == "__main__":
    main()
