# BME680 Sensor Logger for Raspberry Pi Pico WH

A lightweight MicroPython application for logging environmental data from a BME680 sensor to ClickHouse via API Endpoints. Optimized for battery-powered portable deployment.

## Features

- 📊 **Environmental Monitoring**: Temperature, humidity, pressure, and gas resistance
- ☁️ **Cloud Integration**: Direct POST to ClickHouse API Endpoints
- 🔋 **Battery Optimized**: Deep sleep support for extended battery life (8+ days)
- 📡 **WiFi Enabled**: Built-in WiFi connectivity via Pico WH
- 🎛️ **Configurable**: JSON-based configuration for easy deployment
- 🏷️ **Multi-Device**: Hostname support for managing multiple sensors

## Hardware Requirements

- Raspberry Pi Pico WH ($7)
- BME680 Environmental Sensor Breakout ($23)
- LiPo Battery 1000-2000mAh (optional, ~$13)
- LiPo Power Supply (optional, ~$15-20)
- Jumper wires

**Total Cost**: ~$30 (portable) or ~$60 (with battery system)

## Quick Start

1. **Flash MicroPython** to your Pico WH
2. **Install BME680 library** (via Thonny or mpremote)
3. **Wire the sensor** (see SETUP.md for pinout)
4. **Configure** your WiFi and ClickHouse endpoint in `main.py`
5. **Upload `main.py`** to Pico and reboot

See [SETUP.md](SETUP.md) for detailed instructions.

## Project Structure

```
raspberry_pi_pico/
├── AGENTS.md              # AI agent overview
├── main.py                # Main application code
├── README.md              # This file
└── SETUP.md               # Detailed setup instructions
```

## Configuration

## Usage

### Auto-Start on Boot

Simply power on the Pico - `main.py` runs automatically!

### Interactive Mode (via Thonny)

1. Open `main.py` in Thonny IDE
2. Press F5 to run
3. Monitor output in Shell panel
4. Press Ctrl+C to stop

## Data Format

The logger posts data to your ClickHouse endpoint with URL parameters: 
`[ClickHouse host]/insert-sensor-data?time_stamp=2026-02-10%2002:51&temp=21.39&humidity=48.3&pressure=1013.5&sensor=warehouse-01`

## Why Pico WH vs Pi Zero 2 W?

| Advantage | Pico WH | Pi Zero 2 W |
|-----------|---------|-------------|
| **Battery Life** | 8+ days | 10-12 hours |
| **Boot Time** | ~1 second | ~30 seconds |
| **Complexity** | No OS to maintain | Full Linux stack |
| **Cost** | $7 | $15 |
| **Power** | 1-100mA | 150-350mA |

The Pico is perfect for simple sensor logging where you don't need a full OS. For complex data processing, web dashboards, or multi-tool integrations, stick with the Pi Zero 2 W.

## Example Use Cases

- **Home Climate Monitoring**: Track temperature/humidity in different rooms
- **Greenhouse Automation**: Monitor environmental conditions for plants
- **HVAC Optimization**: Log air quality and adjust systems accordingly
- **Weather Stations**: Portable environmental data collection
- **Indoor Air Quality**: VOC monitoring for health and safety

## Troubleshooting

See [the Troubleshooting section of SETUP.md](SETUP.md/#troubleshooting) for common issues and solutions.

## Code Reuse from Pi Zero Version

This code is designed to be similar to the Pi Zero 2 W version:

- ✅ **Same loop structure**: read → post → sleep
- ✅ **Similar HTTP API**: urequests mirrors requests library
- ✅ **URL parameters**: Same approach, different library
- ❌ **Different I2C init**: Machine-specific pin configuration
- ❌ **WiFi setup**: Not needed on Pi (systemd handles it)
- ❌ **No virtualenv**: MicroPython uses direct file imports

**Port difficulty**: About 2-3 hours to adapt existing Pi code.

## Development

### Testing Changes

1. Edit `main.py` locally on your computer
2. Upload to Pico via Thonny or mpremote
3. Run interactively to test
4. Power cycle to test auto-start behavior

### Debugging

Enable verbose output by adding print statements:

```python
print(f"Debug: Variable value = {variable}")
```

Watch output via serial console.

### Adding Features

Common modifications:
- Change sensor read interval: Adjust `SENSOR_INTERVAL` in main.py
- Add more sensors: Expand I2C initialization
- Custom data format: Modify `read_sensor()` method
- Error handling: Add try/except blocks as needed

## Resources

- [MicroPython Docs](https://docs.micropython.org/)
- [Pico W Pinout](https://pinout.xyz/pinout/pico_w)
- [BME680 Library](https://github.com/robert-hh/BME680-Micropython)
- [Thonny IDE](https://thonny.org/)

## License

MIT License - feel free to use and modify for your projects.

## Contributing

Improvements welcome! Common areas:
- Additional sensor support
- More power optimization tricks
- Alternative cloud backends
- Better error handling
- Data buffering for offline operation

## Related Projects

- **Pi Zero 2 W Version**: Full-featured Linux-based logger
- **Jetson Nano Version**: High-performance edge AI integration
- **ESP32 Version**: Alternative microcontroller platform

## Author

Created for Altinity ClickHouse demos and IoT integration examples.

## Changelog

### v1.0.0 (2025-01-23)
- Initial release
- BME680 sensor support
- WiFi connectivity
- ClickHouse API integration
- Deep sleep power optimization
- Configurable hostname and settings
