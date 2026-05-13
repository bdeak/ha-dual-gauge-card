# Dual Gauge Card

A custom Home Assistant card showing energy consumption and supply as dual concentric half-circle gauges.

**Outer arc:** What's consuming power (House + Battery charging)
**Inner arc:** What's supplying power (Solar + Grid + Battery discharge)

## Installation

### HACS
1. Add this repository as a custom repository in HACS (type: Dashboard/Lovelace)
2. Install "Dual Gauge Card"
3. Add the resource if not auto-added

### Manual
1. Copy `dual-gauge-card.js` to `/config/www/`
2. Add resource: `/local/dual-gauge-card.js` (JavaScript Module)

## Configuration

```yaml
type: custom:dual-gauge-card
title: Energy Balance
house_entity: sensor.house_power_consumption
solar_entity: sensor.solar_power
grid_entity: sensor.grid_power
battery_entities:
  - sensor.battery_1_power
  - sensor.battery_2_power
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| title | No | Energy Balance | Card title |
| house_entity | Yes | | House consumption sensor |
| solar_entity | Yes | | Solar production sensor |
| grid_entity | Yes | | Grid meter (+ import, - export) |
| battery_entities | Yes | | List of battery power sensors (+ discharge, - charge) |
| house_color | No | #78909C | |
| solar_color | No | #FFC107 | |
| grid_color | No | #2196F3 | |
| battery_discharge_color | No | #4CAF50 | |
| battery_charge_color | No | #9C27B0 | |
