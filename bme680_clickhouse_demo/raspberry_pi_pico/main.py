# main.py - BME680 to ClickHouse on Raspberry Pi Pico WH
import network
import urequests
import time
import ntptime
from machine import Pin, I2C
import bme680  # You'll need to copy this library too

# ============ CONFIGURATION ============
WIFI_SSID = "Wu-TangLAN"
WIFI_PASSWORD = "7thChamber"
CLICKHOUSE_URL = "https://example-cluster.altinity.cloud:8443/insert-sensor-data"
CLICKHOUSE_USER = "demouser"
CLICKHOUSE_PASSWORD = "demopassword"
SENSOR_NAME = "warehouse-01"
POST_INTERVAL = 60  # seconds between readings

# ============ WiFi SETUP ============
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if not wlan.isconnected():
        print(f"Connecting to WiFi {WIFI_SSID}...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)

        # Wait for connection with timeout
        max_wait = 20
        while max_wait > 0:
            if wlan.isconnected():
                break
            max_wait -= 1
            print(".", end="")
            time.sleep(1)

    if wlan.isconnected():
        print(f"\nConnected! IP: {wlan.ifconfig()[0]}")
        return True
    else:
        print("\nWiFi connection failed!")
        return False

# ============= NTP SETUP ============
def sync_time():
    """Synchronize time with NTP server (gets UTC time)"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Syncing time with NTP server (attempt {attempt + 1}/{max_retries})...")
            ntptime.settime()  # Gets UTC time from pool.ntp.org

            # Verify it worked
            t = time.localtime()
            if t[0] > 2023:  # Sanity check - year should be reasonable
                print(f"✓ Time synced (UTC): {t[0]}-{t[1]:02d}-{t[2]:02d} {t[3]:02d}:{t[4]:02d}:{t[5]:02d}")
                return True
            else:
                print(f"Time sync returned invalid year: {t[0]}")
                time.sleep(2)
        except Exception as e:
            print(f"NTP sync attempt {attempt + 1} failed: {e}")
            time.sleep(2)

    print("✗ Failed to sync time after all retries")
    return False

# ============ BME680 SETUP ============
def setup_sensor():
    # I2C on GP0 (SDA) and GP1 (SCL)
    i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=10000)

    # Scan for devices
    devices = i2c.scan()
    if not devices:
        print("No I2C devices found!")
        return None

    print(f"I2C devices found: {[hex(d) for d in devices]}")

    # Initialize BME680
    sensor = bme680.BME680_I2C(i2c)

    print("BME680 initialized!")
    return sensor

# ============ DATA POSTING ============
def post_to_clickhouse(temp, humidity, pressure):
    timestamp_ms = int(time.time() * 1000)

    # Build URL with parameters
    url = (f"{CLICKHOUSE_URL}?"
           f"time_stamp={timestamp_ms}&"
           f"temp={temp:.2f}&"
           f"humidity={humidity:.2f}&"
           f"pressure={pressure:.2f}&"
           f"sensor={SENSOR_NAME}")

    # Basic auth
    import ubinascii
    auth_string = f"{CLICKHOUSE_USER}:{CLICKHOUSE_PASSWORD}"
    auth_bytes = auth_string.encode('ascii')
    auth_b64 = ubinascii.b2a_base64(auth_bytes).decode('ascii').strip()

    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Length": "0"  # Empty body for POST with URL params
    }

    try:
        response = urequests.post(url, headers=headers)

        if response.status_code == 200:
            print(f"✓ Posted: {temp:.1f}°C, {humidity:.1f}% RH, {pressure:.1f} hPa")
        else:
            print(f"✗ HTTP {response.status_code}: {response.text}")

        response.close()
    except Exception as e:
        print(f"✗ Error: {e}")

# ============ MAIN LOOP ============
def main():
    print("=== Pico WH Sensor Logger Starting ===")

    # Blink LED to show we're alive
    led = Pin("LED", Pin.OUT)
    led.on()
    time.sleep(1)
    led.off()

    # Setup sensor
    sensor = setup_sensor()
    if not sensor:
        print("Can't continue without sensor. Halting.")
        return

    # Connect WiFi
    if not connect_wifi():
        print("Can't continue without WiFi. Resetting in 10 seconds...")
        time.sleep(10)
        import machine
        machine.reset()

    # SYNC TIME IMMEDIATELY AFTER WIFI
    if not sync_time():
        print("⚠ Warning: Time sync failed! Timestamps will be wrong.")
        print("Continuing anyway in 5 seconds...")
        time.sleep(5)

    # Main loop
    print(f"\nStarting measurements every {POST_INTERVAL} seconds...")
    print("Press Ctrl+C to stop\n")

    while True:
        try:
            # Read sensor
            temp = sensor.temperature
            humidity = sensor.humidity
            pressure = sensor.pressure

            # Post to ClickHouse
            post_to_clickhouse(temp, humidity, pressure)

            # Blink LED on successful read
            led.on()
            time.sleep(1)
            led.off()

            # Wait for next reading
            time.sleep(POST_INTERVAL)

        except KeyboardInterrupt:
            print("\nStopping measurements...")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(5)  # Wait before retrying

# Auto-start
if __name__ == "__main__":
    main()

