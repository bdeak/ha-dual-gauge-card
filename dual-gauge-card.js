class DualGaugeCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = config;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const hass = this._hass;
    const config = this._config;

    // Configurable options
    const arcThickness = config.arc_thickness || 22;
    const outerLabel = config.outer_label || 'Consuming';
    const innerLabel = config.inner_label || 'Supplying';
    const showLabels = config.show_labels !== false;
    const showLegend = config.show_legend !== false;

    // Get values
    const house = Math.max(0, parseFloat(hass.states[config.house_entity]?.state || 0));
    const solar = Math.max(0, parseFloat(hass.states[config.solar_entity]?.state || 0));
    const grid = parseFloat(hass.states[config.grid_entity]?.state || 0);
    const gridImport = Math.max(0, grid);

    let batteryTotal = 0;
    const batteryEntities = config.battery_entities || [];
    for (const e of batteryEntities) {
      batteryTotal += parseFloat(hass.states[e]?.state || 0);
    }
    const batteryDischarge = Math.max(0, batteryTotal);
    const batteryCharge = Math.max(0, -batteryTotal);

    // Consuming: house + battery charging
    const consumers = [];
    if (house > 10) consumers.push({ name: 'House', value: house, color: config.house_color || '#78909C' });
    if (batteryCharge > 10) consumers.push({ name: 'Battery', value: batteryCharge, color: config.battery_charge_color || '#9C27B0' });

    // Supplying: solar + grid + battery discharge
    const suppliers = [];
    if (solar > 10) suppliers.push({ name: 'Solar', value: solar, color: config.solar_color || '#FFC107' });
    if (gridImport > 10) suppliers.push({ name: 'Grid', value: gridImport, color: config.grid_color || '#2196F3' });
    if (batteryDischarge > 10) suppliers.push({ name: 'Battery', value: batteryDischarge, color: config.battery_discharge_color || '#4CAF50' });

    const consumeTotal = consumers.reduce((s, c) => s + c.value, 0);
    const supplyTotal = suppliers.reduce((s, c) => s + c.value, 0);

    const formatW = (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'kW' : Math.round(v) + 'W';

    const width = 300;
    const gap = 4;
    const outerR = 115;
    const outerR1 = outerR - arcThickness;
    const outerR2 = outerR;
    const innerR2 = outerR1 - gap;
    const innerR1 = innerR2 - arcThickness;
    const height = outerR + 40;
    const cx = width / 2;
    const cy = outerR + 5;

    const polarToCart = (angle, r) => {
      const rad = (angle - 180) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const arcPath = (startAngle, endAngle, r1, r2) => {
      const s1 = polarToCart(startAngle, r2);
      const e1 = polarToCart(endAngle, r2);
      const s2 = polarToCart(endAngle, r1);
      const e2 = polarToCart(startAngle, r1);
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      return `M${s1.x},${s1.y} A${r2},${r2} 0 ${largeArc} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${r1},${r1} 0 ${largeArc} 0 ${e2.x},${e2.y} Z`;
    };

    const buildArcs = (items, total, r1, r2) => {
      if (total === 0 || items.length === 0) {
        return `<path d="${arcPath(0, 180, r1, r2)}" fill="#444" opacity="0.3"/>`;
      }
      let paths = '';
      let current = 0;
      for (const item of items) {
        const sweep = (item.value / total) * 180;
        if (sweep > 0.5) {
          paths += `<path d="${arcPath(current, current + sweep, r1, r2)}" fill="${item.color}"/>`;
          if (showLabels && sweep > 18) {
            const midAngle = current + sweep / 2;
            const labelR = (r1 + r2) / 2;
            const pos = polarToCart(midAngle, labelR);
            paths += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="bold">${formatW(item.value)}</text>`;
          }
        }
        current += sweep;
      }
      return paths;
    };

    const outerArcs = buildArcs(consumers, consumeTotal, outerR1, outerR2);
    const innerArcs = buildArcs(suppliers, supplyTotal, innerR1, innerR2);

    // Legend
    const allItems = [...consumers, ...suppliers];
    const legend = showLegend ? allItems.map(i => `<span style="margin:0 5px;font-size:11px;white-space:nowrap;"><span style="color:${i.color}">●</span> ${i.name}: ${formatW(i.value)}</span>`).join('') : '';

    this.innerHTML = `
      <ha-card header="${config.title || ''}">
        <div style="padding: 0 16px 12px; text-align:center;${config.title ? '' : 'padding-top:12px;'}">
          <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;">
            <!-- Background arcs -->
            <path d="${arcPath(0, 180, outerR1, outerR2)}" fill="#444" opacity="0.2"/>
            <path d="${arcPath(0, 180, innerR1, innerR2)}" fill="#444" opacity="0.2"/>
            <!-- Data arcs -->
            ${outerArcs}
            ${innerArcs}
            <!-- Center labels -->
            <text x="${cx}" y="${cy - 14}" text-anchor="middle" fill="var(--primary-text-color)" font-size="10" opacity="0.7">${outerLabel}</text>
            <text x="${cx}" y="${cy + 2}" text-anchor="middle" fill="var(--primary-text-color)" font-size="15" font-weight="bold">${formatW(consumeTotal)}</text>
            <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="var(--secondary-text-color)" font-size="9">${innerLabel} ${formatW(supplyTotal)}</text>
          </svg>
          ${legend ? `<div style="margin-top:2px;line-height:1.6;">${legend}</div>` : ''}
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return {
      title: "Energy Balance",
      house_entity: "sensor.house_power_consumption",
      solar_entity: "sensor.growatt_zgq0f6g1bk_pv_power",
      grid_entity: "sensor.ltibber_0100100700ff",
      battery_entities: ["sensor.venus_e_3_0_battery_power", "sensor.venus_e_3_0_device_2_battery_power"]
    };
  }
}

customElements.define('dual-gauge-card', DualGaugeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dual-gauge-card',
  name: 'Dual Gauge Card',
  description: 'Shows energy consumption and supply as dual half-circle gauges'
});
