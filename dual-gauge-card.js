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
    const consumers = [
      { name: 'House', value: house, color: config.house_color || '#78909C' },
    ];
    if (batteryCharge > 10) {
      consumers.push({ name: 'Battery', value: batteryCharge, color: config.battery_charge_color || '#9C27B0' });
    }

    // Supplying: solar + grid + battery discharge
    const suppliers = [];
    if (solar > 10) suppliers.push({ name: 'Solar', value: solar, color: config.solar_color || '#FFC107' });
    if (gridImport > 10) suppliers.push({ name: 'Grid', value: gridImport, color: config.grid_color || '#2196F3' });
    if (batteryDischarge > 10) suppliers.push({ name: 'Battery', value: batteryDischarge, color: config.battery_discharge_color || '#4CAF50' });

    const consumeTotal = consumers.reduce((s, c) => s + c.value, 0);
    const supplyTotal = suppliers.reduce((s, c) => s + c.value, 0);

    const formatW = (v) => v >= 1000 ? (v / 1000).toFixed(1) + ' kW' : Math.round(v) + ' W';

    const width = 300;
    const height = 200;
    const cx = width / 2;
    const outerR = 110;
    const innerR = 70;
    const thickness = outerR - innerR;

    const arcPath = (startAngle, endAngle, r1, r2) => {
      const toRad = (a) => (a - 90) * Math.PI / 180;
      const x1 = cx + r2 * Math.cos(toRad(startAngle));
      const y1 = height - 10 + r2 * Math.sin(toRad(startAngle));
      const x2 = cx + r2 * Math.cos(toRad(endAngle));
      const y2 = height - 10 + r2 * Math.sin(toRad(endAngle));
      const x3 = cx + r1 * Math.cos(toRad(endAngle));
      const y3 = height - 10 + r1 * Math.sin(toRad(endAngle));
      const x4 = cx + r1 * Math.cos(toRad(startAngle));
      const y4 = height - 10 + r1 * Math.sin(toRad(startAngle));
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      return `M${x1},${y1} A${r2},${r2} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${largeArc} 0 ${x4},${y4} Z`;
    };

    const buildArcs = (items, total, r1, r2, startDeg, endDeg) => {
      if (total === 0 || items.length === 0) return '';
      const range = endDeg - startDeg;
      let current = startDeg;
      let paths = '';
      for (const item of items) {
        const sweep = (item.value / total) * range;
        if (sweep > 0.5) {
          paths += `<path d="${arcPath(current, current + sweep, r1, r2)}" fill="${item.color}" />`;
          // Label
          const midAngle = current + sweep / 2;
          const toRad = (a) => (a - 90) * Math.PI / 180;
          const labelR = (r1 + r2) / 2;
          const lx = cx + labelR * Math.cos(toRad(midAngle));
          const ly = height - 10 + labelR * Math.sin(toRad(midAngle));
          if (sweep > 15) {
            paths += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="bold">${formatW(item.value)}</text>`;
          }
        }
        current += sweep;
      }
      return paths;
    };

    // Outer arc: Consuming (top half, -180 to 0)
    const outerArcs = buildArcs(consumers, consumeTotal, outerR - 18, outerR, -180, 0);
    // Inner arc: Supplying (top half, -180 to 0)
    const innerArcs = buildArcs(suppliers, supplyTotal, innerR, innerR + 18, -180, 0);

    // Legend
    const allItems = [...consumers.map(c => ({...c, type: '▼'})), ...suppliers.map(s => ({...s, type: '▲'}))];
    const legend = allItems.map(i => `<span style="margin:0 6px;font-size:11px;"><span style="color:${i.color}">●</span> ${i.name}: ${formatW(i.value)}</span>`).join('');

    this.innerHTML = `
      <ha-card header="${config.title || 'Energy Balance'}">
        <div style="padding: 0 16px 16px; text-align:center;">
          <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;">
            <!-- Background arcs -->
            <path d="${arcPath(-180, 0, outerR - 18, outerR)}" fill="#333" opacity="0.3"/>
            <path d="${arcPath(-180, 0, innerR, innerR + 18)}" fill="#333" opacity="0.3"/>
            <!-- Data arcs -->
            ${outerArcs}
            ${innerArcs}
            <!-- Center labels -->
            <text x="${cx}" y="${height - 50}" text-anchor="middle" fill="var(--primary-text-color)" font-size="11">Consuming</text>
            <text x="${cx}" y="${height - 35}" text-anchor="middle" fill="var(--primary-text-color)" font-size="14" font-weight="bold">${formatW(consumeTotal)}</text>
            <text x="${cx}" y="${height - 15}" text-anchor="middle" fill="var(--secondary-text-color)" font-size="10">Supplying ${formatW(supplyTotal)}</text>
          </svg>
          <div style="margin-top:4px;">${legend}</div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 4;
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
