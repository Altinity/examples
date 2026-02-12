# Setup Guide: BME680 to ClickHouse

Complete step-by-step instructions for setting up the BME680 sensor logger on Raspberry Pi.

## Table of Contents
1. [Raspberry Pi Setup](#raspberry-pi-setup)
2. [Hardware Wiring](#hardware-wiring)
3. [Python Environment](#python-environment)
4. [ClickHouse Configuration](#clickhouse-configuration)
5. [Software Installation](#software-installation)
6. [Testing](#testing)
7. [Running as a Service](#running-as-a-service)

---

## 1. Raspberry Pi Setup

### Install Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Flash Raspberry Pi OS (64-bit) with desktop to your SD card
3. In Imager settings (gear icon):
    - Set hostname (e.g., `sensor-pi`)
    - Configure username/password
    - Set up WiFi credentials
    - Enable SSH
    - Set timezone/locale
4. Boot your Pi and log in

### Initial Configuration
```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Enable I2C for sensor communication
sudo raspi-config
# Navigate: Interface Options → I2C → Yes → OK → Finish
sudo reboot

# Install system dependencies
sudo apt install -y python3-pip python3-venv git i2c-tools

# Verify I2C is working
i2cdetect -y 1
# You should see a grid (sensor will show up after wiring)
```

---

## 2. Hardware Wiring

### BME680 Pinout

The BME680 breakout has 4 pins:
- **VCC** - 3.3V power
- **GND** - Ground
- **SCL** - I2C clock
- **SDA** - I2C data

### Raspberry Pi GPIO Pins

Looking at the Pi with USB ports facing you:
```
Pin 1 (3.3V)  ●  ● Pin 2 (5V)
Pin 3 (SDA)   ●  ● Pin 4 (5V)
Pin 5 (SCL)   ●  ● Pin 6 (GND)
Pin 7         ●  ● Pin 8
Pin 9 (GND)   ●  ● Pin 10
...
```

### Wiring Connections

| BME680 Pin | → | Raspberry Pi Pin | Description |
|------------|---|------------------|-------------|
| VCC        | → | Pin 1            | 3.3V Power ⚠️ NOT 5V! |
| SDA        | → | Pin 3            | I2C Data (GPIO 2) |
| SCL        | → | Pin 5            | I2C Clock (GPIO 3) |
| GND        | → | Pin 6 or 9       | Ground (any GND pin) |

**⚠️ CRITICAL: Use 3.3V (Pin 1), NOT 5V (Pin 2 or 4)! 5V will damage the BME680!**

### Verify Connection
```bash
i2cdetect -y 1
```

You should see `76` or `77` in the grid:
```
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- --
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
70: -- -- -- -- -- -- 76 --
```

If you don't see anything:
- Double-check wiring
- Make sure I2C is enabled in `raspi-config`
- Try the alternate I2C address (some BME680 boards use `0x77`)

---

## 3. Python Environment

### Create Project Directory
```bash
mkdir ~/clickhouse-sensor
cd ~/clickhouse-sensor
```

### Set Up Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it (you'll do this every time you work on the project)
source venv/bin/activate

# Your prompt should now show (venv) at the beginning
```

### Install Dependencies
```bash
# Upgrade pip
pip install --upgrade pip

# Install required packages
pip install bme680 requests python-dotenv smbus2

# Save installed packages
pip freeze > requirements.txt
```

### Auto-Activate on Login (Optional)

Add this to `~/.bashrc` to automatically activate the virtual environment:
```bash
echo "cd ~/clickhouse-sensor && source venv/bin/activate" >> ~/.bashrc
```

---

## 4. ClickHouse Configuration

### Create the Database and Table

Connect to your ClickHouse cluster and run:
```sql
-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS demo;

-- Create sensor data table
CREATE TABLE demo.sensor_data
(
    time_stamp DateTime64(3),
    temp Float32,
    humidity Float32,
    pressure Float32,
    sensor String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(time_stamp)
ORDER BY (sensor, time_stamp);
```

### Test INSERT

Verify you can write to the table:
```sql
INSERT INTO demo.sensor_data (time_stamp, temp, humidity, pressure, sensor)
VALUES (now64(3), 22.5, 45.0, 1013.25, 'test-sensor');

-- Verify the insert
SELECT * FROM demo.sensor_data LIMIT 5;
```

### Get Your Connection Details

You'll need:
- ClickHouse HTTP endpoint URL (e.g., `https://your-cluster.altinity.cloud:8443/`)
- Username
- Password

---

## 5. Software Installation

### Clone the Repository
```bash
cd ~/clickhouse-sensor
git clone https://github.com/Altinity/bme680-clickhouse-demo.git .
```

Or if you downloaded a zip file, extract it here.

### Configure Credentials
```bash
# Copy example files
cp .env.example .env
cp config.json.example config.json

# Edit .env with your credentials
nano .env
```

In `.env`:
```bash
SENSOR_API_USERNAME=your_username
SENSOR_API_PASSWORD=your_password
```
```bash
# Edit config.json with your settings
nano config.json
```

In `config.json`:
```json
{
  "clickhouse_url": "https://your-cluster.altinity.cloud:8443/",
  "sample_interval": 60,
  "sensor_name": "warehouse-01",
  "log_to_console": true,
  "verify_ssl": true
}
```

## 6. Testing

### Test the BME680 Sensor
```bash
source venv/bin/activate
python test_bme680.py
```

You should see temperature, humidity, and pressure readings every 3 seconds.

Expected output:
```
Polling sensor (Ctrl+C to exit)

Temp: 30.5°C
Pressure: 1013.25 hPa
Humidity: 45.2%
------------------------------
```

**Note:** This code was developed with the Pimoroni BME680 module as shown here: 

This is a convenient way to connect the BME680 to the correct pins on the Raspberry Pi without jumper wires. Unfortunately, this puts the temperature sensor very close to the CPU, making the temperature readings higher than they actually are. Temperature will read ~10°C higher than room temperature due to sensor self-heating. This is normal and corrected in the main script.

### Test ClickHouse Connection

Try a manual insert via curl:
```bash
# Replace with your actual credentials and URL
curl -X POST \
  'https://your-cluster.altinity.cloud:8443/' \
  -u 'username:password' \
  -d "INSERT INTO demo.sensor_data (time_stamp, temp, humidity, pressure, sensor) 
      VALUES (now64(3), 22.5, 45.0, 1013.25, 'test')" 
```

If successful, you'll get no output (which means success in ClickHouse!).

Verify in ClickHouse:
```sql
SELECT * FROM demo.sensor_data ORDER BY time_stamp DESC LIMIT 5;
```

### Run the Logger
```bash
source venv/bin/activate
python sensor_to_clickhouse.py
```

Expected output:
```
Sensor Logger initialized successfully!
ClickHouse endpoint: https://your-cluster.altinity.cloud:8443/
Sample interval: 60 seconds
Sensor: raspberry-pi-01
Temperature offset: -10.0°C
SSL verification: disabled (dev mode)

Starting sensor data collection...
Press Ctrl+C to stop

✓ Data sent successfully at 2026-01-09 17:30:00
  Temp: 20.5°C (raw: 30.5°C), Humidity: 45.2%, Pressure: 1013.25 hPa
```

Let it run for a few minutes, then check ClickHouse:
```sql
SELECT * FROM demo.sensor_data 
WHERE sensor = 'raspberry-pi-01' 
ORDER BY time_stamp DESC 
LIMIT 10;
```

---

## 7. Running as a Service

To run the logger automatically on boot:

### Create systemd Service
```bash
sudo nano /etc/systemd/system/sensor-logger.service
```

Paste this (replace `YOUR_USERNAME` with your actual username):
```ini
[Unit]
Description=BME680 Sensor to ClickHouse Logger
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/clickhouse-sensor
Environment="PATH=/home/YOUR_USERNAME/clickhouse-sensor/venv/bin"
ExecStart=/home/YOUR_USERNAME/clickhouse-sensor/venv/bin/python /home/YOUR_USERNAME/clickhouse-sensor/sensor_to_clickhouse.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start
```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable sensor-logger.service

# Start the service now
sudo systemctl start sensor-logger.service

# Check status
sudo systemctl status sensor-logger.service

# View logs
sudo journalctl -u sensor-logger.service -f
```

### Service Management Commands
```bash
# Stop the service
sudo systemctl stop sensor-logger.service

# Restart the service
sudo systemctl restart sensor-logger.service

# Disable auto-start on boot
sudo systemctl disable sensor-logger.service

# View recent logs
sudo journalctl -u sensor-logger.service -n 50
```

---

## Optional: OLED Display Setup

If you have a UCTronics Pi Rack Pro or similar OLED display:

### Test OLED
```bash
source venv/bin/activate
python display_stats.py
```

The OLED should show:
- IP address
- CPU usage
- Memory usage
- Disk usage

### Run as Service

Create `/etc/systemd/system/oled-stats.service`:
```ini
[Unit]
Description=OLED Stats Display
After=network.target

[Service]
ExecStart=/home/YOUR_USERNAME/clickhouse-sensor/venv/bin/python /home/YOUR_USERNAME/clickhouse-sensor/display_stats.py
WorkingDirectory=/home/YOUR_USERNAME/clickhouse-sensor
User=YOUR_USERNAME
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl enable oled-stats.service
sudo systemctl start oled-stats.service
```

---

## Next Steps

- Build a Grafana dashboard to visualize your sensor data
- Add more sensors (multiple BME680s, or other I2C sensors)
- Set up alerts for temperature thresholds
- Explore ClickHouse's time-series analysis functions

## Troubleshooting

See [the troubleshooting guide](docs/troubleshooting.md) for common issues and solutions.

## Need Help?

- Open an issue on GitHub
- Check the blog post for additional context
- Join the Altinity community Slack