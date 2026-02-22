# AGENTS.md - Raspberry Pi Pico WH Sensor Development

## Project Overview
Development of a battery-powered IoT temperature sensor using a Raspberry Pi Pico WH and BME680 environmental sensor, logging data to ClickHouse via Altinity API Endpoints.

## Hardware Components
- Raspberry Pi Pico WH (RP2040 with WiFi)
- Adafruit BME680 temperature/humidity/pressure sensor
- Adafruit PowerBoost 500 Charger
- 3.7V 2500mAh Lithium Ion Polymer Battery
- Breadboard and jumper wires

## Development Process

### Phase 1: Initial Planning and Assumptions
**Human Goal:** Replicate existing Raspberry Pi sensor logging system on a Pico WH with battery power.

**Agent Approach:** I initially proposed a complex setup involving:
- JSON POST bodies to ClickHouse
- Standard ClickHouse INSERT queries
- Multiple citation-heavy explanations

**Critical Miss:** I completely overlooked that the human had:
1. An existing database schema with specific column names (`time_stamp`, `temp`, `humidity`, `pressure`, `sensor`)
2. A working pattern using Altinity API Endpoints with URL parameters
3. A preference for GET/POST requests with parameters in the URL, not JSON bodies

**Learning:** When someone says "like we did for the earlier python script," actually pay attention to the existing patterns rather than assuming standard approaches.

### Phase 2: Hardware Configuration Discovery
**Challenge:** The PowerBoost 500 arrived as an unassembled kit without pin headers or USB port attached.

**Agent Assumption:** I initially described direct pin connections (PowerBoost pins → Pico VSYS), assuming assembled hardware.

**Human Reality Check:** "The USB-A port isn't attached to the board. Can I just snap it on, or do I need to solder it?"

**Resolution:** Identified that without soldering equipment at current location, the human should:
1. Prototype using USB power from MacBook
2. Solder PowerBoost components later at home
3. This actually improved the development workflow - test code with stable power first, add battery later

**Learning:** Ask about hardware state rather than assuming. "Do you have a soldering iron available?" would have saved time.

### Phase 3: Pico Power Architecture Clarification
**Human Question:** "I thought you'd just run a cable from the microUSB on the powerboost to the microUSB on the pico."

**Agent Error:** I jumped to explaining the "more efficient" direct pin connection without first acknowledging the simpler USB cable approach.

**Correction:** Explained both methods clearly:
- Option A: USB cable (simple, perfect for prototyping)
- Option B: Direct pins (more efficient, for final deployment)

**Learning:** Start with the simplest approach that works, then offer optimizations. Don't lead with complexity.

### Phase 4: I2C Communication Debugging
**Initial Error:** `[Errno 5] EIO` - I2C communication failure

**Troubleshooting Process:**
1. Verified sensor detection with `i2c.scan()` - found device at 0x77 ✓
2. Verified chip ID read - got 0x61 (correct for BME680) ✓
3. Attempted register writes - failed with EIO ✗
4. **Solution:** Reduced I2C frequency from 100kHz to 10kHz

**Root Cause:** BME680 sensor (possibly a clone or marginal unit) couldn't handle standard 100kHz I2C clock speed. The slower 10kHz rate provided more reliable communication.

**Code Change:**
```python
# Before (failed)
i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=100000)

# After (works)
i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=10000)
```

**Learning:** When I2C devices are detected but fail on read/write, clock speed is a common culprit. Start with diagnostic reads before attempting complex operations.

### Phase 5: API Endpoint Integration - The Big Miss
**Human Requirement:** "This is totally wrong. Here's the schema for the database... I need a Basic Authentication header, and the URL needs to have the parameters in it."

**Agent's Initial Approach:** 
- JSON POST bodies with `INSERT INTO` queries
- Standard ClickHouse HTTP interface patterns
- Over-engineered solutions

**What I Should Have Asked:** "Can you show me the working Raspberry Pi code?" This would have immediately revealed:
1. Altinity API Endpoints pattern
2. POST method with URL parameters
3. Exact parameter names matching the schema

**The Actual Pattern:**
```python
url = f"{CLICKHOUSE_URL}?time_stamp={ms}&temp={t}&humidity={h}&pressure={p}&sensor={name}"
response = urequests.post(url, headers={"Authorization": f"Basic {auth}"})
```

**Debugging Journey:**
1. First attempt: GET request → 404 "There is no handle /insert-sensor-data"
2. Second attempt: POST without Content-Length → 411 error
3. **Final solution:** POST with `Content-Length: 0` header (empty body, all data in URL)

**Human's Exasperated Response:** "Jesus. this is a POST."

**Learning:** When replicating existing code, GET THE EXISTING CODE FIRST. Don't assume patterns. The human had a working system; my job was to port it, not redesign it.

### Phase 6: Timestamp Synchronization
**Problem Discovered:** When running standalone on battery, Pico defaulted to January 1, 2021 midnight.

**Root Cause:** Raspberry Pi Pico has no real-time clock (RTC). When connected via Thonny to MacBook, time was implicitly synced. On battery power, no time sync occurred.

**Solution:** Added NTP synchronization after WiFi connection:

```python
import ntptime

def sync_time():
    """Synchronize time with NTP server (gets UTC time)"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            ntptime.settime()  # Gets UTC from pool.ntp.org
            t = time.localtime()
            if t[0] > 2023:  # Sanity check
                print(f"✓ Time synced (UTC): {t[0]}-{t[1]:02d}-{t[2]:02d} {t[3]:02d}:{t[4]:02d}:{t[5]:02d}")
                return True
        except Exception as e:
            print(f"NTP sync failed: {e}")
            time.sleep(2)
    return False
```

**Timing:** Must be called immediately after WiFi connects, before any sensor readings.

**Learning:** Embedded devices without RTCs need explicit time synchronization. What works in development (tethered to computer) may fail in production (standalone).

### Phase 7: Soldering Skills Transfer
**Human Concern:** "I'm nervous about soldering such small connections"

**Agent Response:** Provided detailed soldering instruction, focusing on:
1. Order of operations (small pins first, metal tabs second)
2. Heating technique specifics
3. Reassurance about forgiveness of through-hole soldering

**Critical Teaching Moment:** Human revealed fundamental misunderstanding:
> "You mean I've got the tip of the iron on both the pin and the board? Then I pull the iron away and put the solder on the hot surface?"

**This explained years of soldering struggles.** The human had been:
- Melting solder on the iron tip
- Removing the iron
- Trying to apply pre-melted solder to a cold joint

**Correct Technique Clarified:**
1. Iron touches BOTH pin and pad (heats them together)
2. While iron is still there, touch solder to the joint
3. Solder melts from the heat of the joint, not the iron
4. Remove solder first, then iron
5. Let cool 2-3 seconds

**Human Response After Correction:** "Okay, soldering went great, thanks for the knowledge!"

**Learning:** Never assume basic techniques are understood. What seems obvious to someone experienced can be a revelation to someone self-taught. Taking time to explain fundamentals can unlock capabilities.

## Final Working System

### Hardware Configuration
- Pico powered by PowerBoost 500 via USB cable
- BME680 connected via I2C (GP0=SDA, GP1=SCL) at 10kHz
- 3.3V power from Pico pin 36 to sensor
- Battery runtime: ~30-40 hours at 60-second intervals

### Software Architecture
```python
# Startup sequence
1. WiFi connection
2. NTP time synchronization (critical!)
3. BME680 sensor initialization (slow I2C)
4. Main loop: read sensors → POST to API Endpoint → sleep

# Key parameters
I2C frequency: 10000 Hz (not standard 100000)
POST interval: 60 seconds
Timestamp format: Unix milliseconds (UTC)
```

### ClickHouse Integration
- **Database:** `maddie.sensor_data`
- **Schema:** `time_stamp DateTime64(3), temp Float32, humidity Float32, pressure Float32, sensor String`
- **API Endpoint:** Altinity custom endpoint with URL parameters
- **Method:** POST with empty body, all data in URL query string
- **Auth:** Basic Authentication header

### Critical Code Snippets

**I2C Initialization (with slow clock):**
```python
i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=10000)
sensor = bme680.BME680_I2C(i2c, address=0x77)
```

**POST to API Endpoint:**
```python
def post_to_clickhouse(temp, humidity, pressure):
    timestamp_ms = int(time.time() * 1000)
    url = (f"{CLICKHOUSE_URL}?"
           f"time_stamp={timestamp_ms}&"
           f"temp={temp:.2f}&"
           f"humidity={humidity:.2f}&"
           f"pressure={pressure:.2f}&"
           f"sensor={SENSOR_NAME}")
    
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Length": "0"
    }
    response = urequests.post(url, headers=headers)
```

## Agent Performance Analysis

### What Went Well
1. **Hardware troubleshooting:** Systematic I2C debugging identified the frequency issue
2. **Educational explanations:** Power flow, pinout diagrams, and especially soldering technique
3. **Error recovery:** When initial approaches failed, pivoted to diagnostics
4. **Persistent support:** Worked through multiple issues without giving up

### What Went Wrong
1. **Failed to respect existing patterns:** Assumed standard approaches instead of asking about current implementation
2. **Over-complicated initial proposals:** JSON bodies, INSERT queries, when simple URL params were needed
3. **Missed the schema details:** Didn't carefully read the provided database schema initially
4. **Assumed hardware state:** Didn't ask if components needed assembly

### Key Lessons for Future Agent Interactions

1. **When replicating existing code, REQUEST THE EXISTING CODE FIRST**
   - "Can you show me your working Raspberry Pi script?"
   - Don't reinvent the wheel
   
2. **Read provided specifications carefully**
   - Database schemas contain exact requirements
   - Column names matter
   - Data types matter

3. **Ask about physical constraints early**
   - "Do you have soldering equipment?"
   - "What's the current state of your hardware?"
   - "Are you working from home or traveling?"

4. **Start simple, then optimize**
   - USB cable before direct pin connections
   - Tethered development before battery operation
   - Working code before efficient code

5. **Validate assumptions explicitly**
   - "Is this a POST or GET?"
   - "Are you using standard ClickHouse or an API Endpoint?"
   - Don't assume based on "normal" patterns

6. **Teaching moments are valuable**
   - The soldering explanation unlocked a skill
   - Taking time to explain fundamentals pays off
   - Analogies help ("like heating the pan, not the spatula")

## Outcome
- ✅ Fully functional battery-powered sensor
- ✅ Logging to ClickHouse via API Endpoints
- ✅ 30+ hour battery life
- ✅ Human gained soldering confidence
- ✅ System running overnight successfully

## The Humbling Truth
Despite my knowledge of ClickHouse, MicroPython, and embedded systems, I initially **missed the forest for the trees** by not simply asking "How does your current system work?" The human had to explicitly correct me multiple times before I properly understood the requirements. This is a valuable reminder that **listening and understanding existing patterns is more important than demonstrating technical knowledge.**
