# Troubleshooting Guide

## Sensor Issues

### Sensor Not Detected

**Symptom:** `i2cdetect -y 1` shows no device at 0x76 or 0x77

**Solutions:**
1. Check wiring - especially that you're using Pin 1 (3.3V) not Pin 2 (5V)
2. Verify I2C is enabled:
```bash
   sudo raspi-config
   # Interface Options → I2C → Yes
   sudo reboot
```
3. Try the other I2C bus:
```bash
   i2cdetect -y 0  # Some Pi models use bus 0
```
4. Check for loose connections
5. Try a different BME680 board (yours might be damaged)

### Sensor Reads "Hot"

**Symptom:** Temperature reads 10-15°C higher than room temperature

**This is normal!** The BME680 generates heat during operation. The script includes a calibration offset (`TEMP_OFFSET_C`) to compensate.

**To adjust:**
1. Measure actual room temperature with a thermometer
2. Note the BME680's raw reading
3. Calculate difference
4. Edit `sensor_to_clickhouse.py` line 23:
```python
   TEMP_OFFSET_C = -YOUR_DIFFERENCE  # e.g., -10.0
```

### Sensor Stops Responding

**Symptom:** Script runs but sensor readings fail intermittently

**Solutions:**
1. Check power supply - use official Pi power adapter
2. Add a 10µF capacitor between VCC and GND if you have long wires
3. Reduce wire length between Pi and sensor
4. Check for loose connections

---

## Python Issues

### "ModuleNotFoundError: No module named 'bme680'"

**Cause:** Virtual environment not activated or dependencies not installed

**Solution:**
```bash
cd ~/clickhouse-sensor
source venv/bin/activate  # You should see (venv) in prompt
pip install -r requirements.txt
```

### "Permission denied" Errors

**Cause:** User doesn't have I2C permissions

**Solution:**
```bash
sudo usermod -a -G i2c $USER
# Log out and back in for changes to take effect
```

### Virtual Environment Issues

**Symptom:** Packages installed but script can't find them

**Solution:** Always activate venv before running scripts:
```bash
source venv/bin/activate
python sensor_to_clickhouse.py
```

To check if venv is active:
```bash
which python
# Should show: /home/USERNAME/clickhouse-sensor/venv/bin/python
```

---

## ClickHouse Connection Issues

### SSL Certificate Errors

**Symptom:**
```
SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED]'))
```

**Solution for dev environments:**
Set `"verify_ssl": false` in `config.json`

**Solution for production:**
```bash
# Download and trust the certificate
echo | openssl s_client -servername YOUR_HOST -connect YOUR_HOST:8443 2>/dev/null | openssl x509 -outform PEM > server.pem

# Update config.json:
# (This doesn't work in current script - just use verify_ssl: false for now)
```

### Authentication Errors

**Symptom:**
```
401 Client Error: Unauthorized
```

**Solutions:**
1. Verify credentials in `.env`:
```bash
   cat .env  # Check for typos
```
2. Test credentials with curl:
```bash
   curl -u "username:password" https://YOUR_HOST:8443/ --insecure
```
3. Check that environment variables are loaded:
```python
   # Add to script temporarily:
   print(f"Username: {os.getenv('SENSOR_API_USERNAME')}")
```

### Connection Timeouts

**Symptom:**
```
ReadTimeout: HTTPSConnectionPool... (read timeout=10)
```

**Solutions:**
1. Check network connectivity:
```bash
   ping YOUR_HOST
```
2. Increase timeout in script (line ~120):
```python
   timeout=30  # Increase from 10 to 30
```
3. Check firewall rules on ClickHouse server

### "Table doesn't exist" Errors

**Symptom:**
```
Code: 60. DB::Exception: Table demo.sensor_data doesn't exist
```

**Solution:**
```sql
-- Connect to ClickHouse and create the table
CREATE TABLE demo.sensor_data
(
    time_stamp DateTime64(3),
    temp Float32,
    humidity Float32,
    pressure Float32,
    sensor String
)
ENGINE = MergeTree()
ORDER BY (sensor, time_stamp);
```

---

## Service Issues

### Service Won't Start

**Symptom:**
```bash
sudo systemctl status sensor-logger.service
# Shows: Failed to start
```

**Solutions:**
1. Check service file syntax:
```bash
   sudo systemctl daemon-reload
   sudo journalctl -u sensor-logger.service -n 50
```
2. Verify paths in service file are correct
3. Test script manually first:
```bash
   cd ~/clickhouse-sensor
   source venv/bin/activate
   python sensor_to_clickhouse.py
```
4. Check file permissions:
```bash
   ls -l sensor_to_clickhouse.py  # Should be readable
```

### Service Starts But Crashes

**Check logs:**
```bash
sudo journalctl -u sensor-logger.service -f
```

Common issues:
- `.env` file not found (service runs from different directory)
- Sensor not connected
- Network not ready on boot

**Solution:** Add delays to service file:
```ini
[Unit]
After=network-online.target
Wants=network-online.target

[Service]
RestartSec=10
```

---

## Performance Issues

### High CPU Usage

**Cause:** Polling interval too fast

**Solution:** Increase `sample_interval` in `config.json`:
```json
{
  "sample_interval": 300  // 5 minutes instead of 60 seconds
}
```

### Memory Leaks

**Symptom:** Script memory usage grows over time

**Solution:** Restart service periodically:
```bash
sudo systemctl restart sensor-logger.service
```

Or add to service file:
```ini
[Service]
RuntimeMaxSec=86400  # Restart every 24 hours
```

---

## Getting Help

If you're still stuck:

1. **Check logs:**
```bash
   sudo journalctl -u sensor-logger.service -n 100
```

2. **Run in debug mode:**
   Add print statements to see what's happening:
```python
   print(f"DEBUG: About to send data: {payload}")
```

3. **Test components individually:**
    - Sensor: `python test_bme680.py`
    - ClickHouse: Use curl
    - Network: `ping YOUR_HOST`

4. **Open a GitHub issue:**
   Include:
    - Error messages (full text)
    - Your config.json (without credentials!)
    - Output from `i2cdetect -y 1`
    - Raspberry Pi model
    - Python version: `python --version`

5. **Join the community:**
    - Altinity Slack
    - Raspberry Pi Forums
    - ClickHouse Community