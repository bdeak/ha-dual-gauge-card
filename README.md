# Dual Gauge Card

A custom Home Assistant Lovelace card that visualizes energy flow as two concentric half-circle gauges.

**Outer arc:** What's consuming power (House + Battery charging)
**Inner arc:** What's supplying power (Solar + Grid + Battery discharge)

Both arcs represent the same total energy — showing at a glance where power comes from and where it goes.

![Dual Gauge Card](https://raw.githubusercontent.com/bdeak/ha-dual-gauge-card/main/screenshot.png)

## Features

- Dual concentric 180° arcs showing consumption vs supply
- Proportional segments for each energy source/consumer
- Auto-hides segments when inactive (e.g., battery only shows when charging/discharging)
- Configurable colors, thickness, and labels
- Responsive sizing
- Real-time updates

## Installation

### HACS (recommended)

1. Open HACS → Frontend
2. Click ⋮ → Custom repositories
3. Add `https://github.com/bdeak/ha-dual-gauge-card` as type **Dashboard**
4. Search for "Dual Gauge Card" and install
5. Refresh your browser

### Manual

1. Download `dual-gauge-card.js` from the latest release
2. Copy to `/config/www/dual-gauge-card.js`
3. Add resource in HA: Settings → Dashboards → Resources → Add
   - URL: `/local/dual-gauge-card.js`
   - Type: JavaScript Module

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
| `title` | No | | Card title. Omit or set to `""` for no title. |
| `house_entity` | Yes | | Total house consumption sensor (W) |
| `solar_entity` | Yes | | Solar production sensor (W) |
| `grid_entity` | Yes | | Grid meter sensor (W). Positive = importing, negative = exporting |
| `battery_entities` | Yes | | List of battery power sensors (W). Positive = discharging, negative = charging |
| `consumer_entities` | No | `[]` | List of named consumers to show as separate segments in outer ring (see below) |
| `center_display` | No | `consuming` | What to show in center: `consuming`, `grid`, or `supplying` |
| `arc_thickness` | No | `22` | Thickness of each arc in pixels |
| `outer_label` | No | `Consuming` | Label for the outer arc |
| `inner_label` | No | `Supplying` | Label for the inner arc |
| `show_labels` | No | `true` | Show watt values on arc segments |
| `show_legend` | No | `true` | Show legend below the chart |
| `house_color` | No | `#78909C` | Color for house consumption |
| `solar_color` | No | `#FFC107` | Color for solar production |
| `grid_color` | No | `#2196F3` | Color for grid import |
| `battery_discharge_color` | No | `#4CAF50` | Color for battery discharging |
| `battery_charge_color` | No | `#9C27B0` | Color for battery charging |

### Sensor requirements

- **House entity:** Total house consumption in watts. Can be a template sensor: `grid + solar + battery`
- **Grid entity:** Must be positive when importing from grid, negative when exporting
- **Battery entities:** Must be positive when discharging, negative when charging. Multiple batteries are summed automatically.
- **Solar entity:** Solar production in watts (always positive)

### Example: Minimal

```yaml
type: custom:dual-gauge-card
house_entity: sensor.house_power_consumption
solar_entity: sensor.solar_power
grid_entity: sensor.grid_power
battery_entities:
  - sensor.battery_power
```

### Example: Customized

```yaml
type: custom:dual-gauge-card
title: ""
house_entity: sensor.house_power_consumption
solar_entity: sensor.growatt_pv_power
grid_entity: sensor.tibber_grid_power
battery_entities:
  - sensor.battery_1_power
  - sensor.battery_2_power
consumer_entities:
  - entity: sensor.car_charger_power
    name: Car
    color: "#00BCD4"
  - entity: sensor.pool_heater_power
    name: Pool
    color: "#26C6DA"
center_display: grid
arc_thickness: 26
outer_label: Load
inner_label: Source
show_legend: true
house_color: "#607D8B"
solar_color: "#FF9800"
grid_color: "#1976D2"
battery_discharge_color: "#388E3C"
battery_charge_color: "#7B1FA2"
```

### Consumer entities

The `consumer_entities` option lets you break down the outer (consuming) ring into named components. Each entry needs:

| Field | Required | Description |
|-------|----------|-------------|
| `entity` | Yes | Power sensor entity ID |
| `name` | No | Display name (defaults to entity ID) |
| `color` | No | Segment color (defaults to grey) |

The "House" segment automatically shows the remaining consumption after subtracting all listed consumers. This keeps the total accurate.

### Center display

| Value | Shows |
|-------|-------|
| `consuming` | Total consumption (default) |
| `grid` | Grid power + House as secondary |
| `supplying` | Total supply |

## How it works

The card reads power sensors every time Home Assistant updates state and renders:

- **Outer arc (Consuming):** Shows where power is going
  - House load (always present)
  - Battery charging (only when batteries are charging)

- **Inner arc (Supplying):** Shows where power comes from
  - Solar (when producing)
  - Grid (when importing)
  - Battery discharge (when batteries are discharging)

Segments are proportional to their power contribution. Small segments (< 10W) are hidden to avoid clutter.

## License

MIT
