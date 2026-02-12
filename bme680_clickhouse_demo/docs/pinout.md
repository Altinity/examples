# BME680 and Raspberry Pi Pinout Reference

## Quick Reference

| BME680 | Wire Color | Pi Pin # | Pi GPIO |
|--------|-----------|----------|---------|
| VCC    | Red       | 1        | 3.3V    |
| SDA    | Yellow    | 3        | GPIO 2  |
| SCL    | White     | 5        | GPIO 3  |
| GND    | Black     | 6        | GND     |

## Raspberry Pi 40-Pin Header
```
     3.3V [ 1] [ 2] 5V
      SDA [ 3] [ 4] 5V
      SCL [ 5] [ 6] GND    ← Connect BME680 GND here
  GPIO  4 [ 7] [ 8] GPIO 14
      GND [ 9] [10] GPIO 15
 GPIO 17 [11] [12] GPIO 18
 GPIO 27 [13] [14] GND
 GPIO 22 [15] [16] GPIO 23
     3.3V [17] [18] GPIO 24
 GPIO 10 [19] [20] GND
  GPIO 9 [21] [22] GPIO 25
 GPIO 11 [23] [24] GPIO 8
      GND [25] [26] GPIO 7
  GPIO 0 [27] [28] GPIO 1
  GPIO 5 [29] [30] GND
  GPIO 6 [31] [32] GPIO 12
 GPIO 13 [33] [34] GND
 GPIO 19 [35] [36] GPIO 16
 GPIO 26 [37] [38] GPIO 20
      GND [39] [40] GPIO 21
```

## Common Mistakes

### ❌ Wrong: Connecting to 5V
```
VCC → Pin 2 (5V)  // This will damage the BME680!
```

### ✅ Correct: Connecting to 3.3V
```
VCC → Pin 1 (3.3V)
```

### ❌ Wrong: Assuming odd pins are all on left
Pin numbering goes across rows, not down columns!

### ✅ Correct: Numbering scheme
```
[1] [2]   ← Row 1
[3] [4]   ← Row 2  
[5] [6]   ← Row 3
```

## I2C Address

The BME680 typically appears at:
- `0x76` (most common)
- `0x77` (alternate address on some boards)

Check with:
```bash
i2cdetect -y 1
```

## Multiple BME680 Sensors

To connect multiple BME680 sensors:
1. Use boards with different I2C addresses (0x76 and 0x77)
2. Or use an I2C multiplexer like TCA9548A
3. Power and ground can be shared, but each needs its own SDA/SCL or multiplexer channel