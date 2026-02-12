# test_bme680.py
import bme680
import time

try:
    sensor = bme680.BME680(bme680.I2C_ADDR_PRIMARY)
except (RuntimeError, IOError):
    sensor = bme680.BME680(bme680.I2C_ADDR_SECONDARY)

# Configure sensor
sensor.set_humidity_oversample(bme680.OS_2X)
sensor.set_pressure_oversample(bme680.OS_4X)
sensor.set_temperature_oversample(bme680.OS_8X)
sensor.set_filter(bme680.FILTER_SIZE_3)

print("Polling sensor (Ctrl+C to exit)\n")

try:
    while True:
        if sensor.get_sensor_data():
            print(f"Temp: {sensor.data.temperature:.2f}°C")
            print(f"Pressure: {sensor.data.pressure:.2f} hPa")
            print(f"Humidity: {sensor.data.humidity:.2f}%")
            print("-" * 30)

        time.sleep(3)

except KeyboardInterrupt:
    print("\nExiting...")
