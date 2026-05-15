class DualGaugeCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  setConfig(config) {
    this._config = config;
    this._prevConsumerAngles = [];
    this._prevSupplierAngles = [];
  }

  _update() {
    if (!this._hass || !this._config) return;

    const hass = this._hass;
    const config = this._config;

    const arcThickness = config.arc_thickness || 22;
    const outerLabel = config.outer_label || 'Consuming';
    const innerLabel = config.inner_label || 'Supplying';
    const showLabels = config.show_labels !== false;
    const showLegend = config.show_legend !== false;
    const animate = config.animate !== false;

    const house = Math.max(0, parseFloat(hass.states[config.house_entity]?.state || 0));
    const solar = Math.max(0, parseFloat(hass.states[config.solar_entity]?.state || 0));
    const grid = parseFloat(hass.states[config.grid_entity]?.state || 0);
    const gridImport = Math.max(0, grid);

    let batteryTotal = 0;
    for (const e of (config.battery_entities || [])) {
      batteryTotal += parseFloat(hass.states[e]?.state || 0);
    }
    const batteryDischarge = Math.max(0, batteryTotal);
    const batteryCharge = Math.max(0, -batteryTotal);

    const priceLevel = config.price_level_entity ? (hass.states[config.price_level_entity]?.state || '') : '';
    const priceValue = config.price_entity ? parseFloat(hass.states[config.price_entity]?.state || 0) : null;
    const priceColors = { 'very_cheap': '#4CAF50', 'cheap': '#66BB6A', 'normal': '#FF9800', 'expensive': '#FF5722', 'very_expensive': '#F44336' };

    // Build consumer list
    const consumers = [];
    let knownConsumers = 0;
    for (const ce of (config.consumer_entities || [])) {
      const val = Math.max(0, parseFloat(hass.states[ce.entity]?.state || 0));
      if (val > 1) {
        consumers.push({ name: ce.name || ce.entity, value: val, color: ce.color || '#B0BEC5', font_color: ce.font_color || 'white' });
        knownConsumers += val;
      }
    }
    if (batteryCharge > 50) {
      consumers.push({ name: 'Battery', value: batteryCharge, color: config.battery_charge_color || '#9C27B0', font_color: config.battery_charge_font_color || 'white' });
      knownConsumers += batteryCharge;
    }
    const remainingHouse = Math.max(50, house - knownConsumers);
    consumers.unshift({ name: 'House', value: remainingHouse, color: config.house_color || '#78909C', font_color: config.house_font_color || 'white' });

    // Build supplier list
    const suppliers = [];
    if (solar > 1) suppliers.push({ name: 'Solar', value: solar, color: config.solar_color || '#FFC107', font_color: config.solar_font_color || 'white' });
    if (gridImport > 1) suppliers.push({ name: 'Grid', value: gridImport, color: config.grid_color || '#2196F3', font_color: config.grid_font_color || 'white' });
    if (batteryDischarge > 50) suppliers.push({ name: 'Battery', value: batteryDischarge, color: config.battery_discharge_color || '#4CAF50', font_color: config.battery_discharge_font_color || 'white' });

    const consumeTotal = consumers.reduce((s, c) => s + c.value, 0);
    const supplyTotal = suppliers.reduce((s, c) => s + c.value, 0);

    // Target angles
    const targetConsumerAngles = this._calcAngles(consumers, consumeTotal);
    const targetSupplierAngles = this._calcAngles(suppliers, supplyTotal);

    // Center display
    const centerDisplay = config.center_display || 'consuming';
    let centerLabel, centerValue, secondaryLabel, secondaryValue;
    if (centerDisplay === 'grid') {
      centerLabel = 'Grid'; centerValue = Math.abs(grid); secondaryLabel = 'House'; secondaryValue = house;
    } else if (centerDisplay === 'supplying') {
      centerLabel = innerLabel; centerValue = supplyTotal; secondaryLabel = outerLabel; secondaryValue = consumeTotal;
    } else {
      centerLabel = outerLabel; centerValue = consumeTotal; secondaryLabel = innerLabel; secondaryValue = supplyTotal;
    }

    // Store render data
    this._renderData = { config, consumers, suppliers, consumeTotal, supplyTotal, targetConsumerAngles, targetSupplierAngles, priceLevel, priceValue, priceColors, centerLabel, centerValue, secondaryLabel, secondaryValue, showLabels, showLegend, outerLabel, innerLabel, arcThickness, width: 300, animate };

    if (animate && this._prevConsumerAngles.length > 0) {
      this._animateTo(targetConsumerAngles, targetSupplierAngles);
    } else {
      this._prevConsumerAngles = targetConsumerAngles;
      this._prevSupplierAngles = targetSupplierAngles;
      this._draw();
    }
  }

  _calcAngles(items, total) {
    if (total === 0) return [];
    let current = 0;
    return items.map(item => {
      const sweep = (item.value / total) * 180;
      const start = current;
      current += sweep;
      return { start, end: current, item };
    });
  }

  _animateTo(targetC, targetS) {
    const duration = 600;
    const startTime = performance.now();
    const fromC = this._padAngles(this._prevConsumerAngles, targetC.length);
    const fromS = this._padAngles(this._prevSupplierAngles, targetS.length);

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

      this._prevConsumerAngles = this._interpolateAngles(fromC, targetC, ease);
      this._prevSupplierAngles = this._interpolateAngles(fromS, targetS, ease);
      this._draw();

      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _padAngles(arr, targetLen) {
    const result = [...arr];
    while (result.length < targetLen) result.push({ start: 180, end: 180, item: { value: 0, color: '#444', font_color: 'white', name: '' } });
    return result.slice(0, targetLen);
  }

  _interpolateAngles(from, to, t) {
    return to.map((target, i) => {
      const f = from[i] || { start: 180, end: 180 };
      return {
        start: f.start + (target.start - f.start) * t,
        end: f.end + (target.end - f.end) * t,
        item: target.item
      };
    });
  }

  _draw() {
    const d = this._renderData;
    if (!d) return;

    const { config, consumers, suppliers, consumeTotal, supplyTotal, priceLevel, priceValue, priceColors, centerLabel, centerValue, secondaryLabel, secondaryValue, showLabels, showLegend, arcThickness, width, animate } = d;

    const formatW = (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'kW' : Math.round(v) + 'W';

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
      if (endAngle - startAngle < 0.1) return '';
      const s1 = polarToCart(startAngle, r2);
      const e1 = polarToCart(endAngle, r2);
      const s2 = polarToCart(endAngle, r1);
      const e2 = polarToCart(startAngle, r1);
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      return `M${s1.x},${s1.y} A${r2},${r2} 0 ${largeArc} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${r1},${r1} 0 ${largeArc} 0 ${e2.x},${e2.y} Z`;
    };

    // Build SVG
    let svg = '';

    // Price
    if (priceLevel) {
      const pColor = priceColors[priceLevel] || '#999';
      const pLabel = priceLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      svg += `<text x="10" y="18" fill="${pColor}" font-size="11" font-weight="bold">${pLabel}</text>`;
    }
    if (priceValue !== null) {
      svg += `<text x="${width - 10}" y="18" text-anchor="end" fill="var(--primary-text-color)" font-size="11">${Math.round(priceValue)} ct/kWh</text>`;
    }

    // Background
    svg += `<path d="${arcPath(0, 180, outerR1, outerR2)}" fill="#444" opacity="0.2"/>`;
    svg += `<path d="${arcPath(0, 180, innerR1, innerR2)}" fill="#444" opacity="0.2"/>`;

    // Outer arcs (consumers)
    for (const a of this._prevConsumerAngles) {
      const p = arcPath(a.start, a.end, outerR1, outerR2);
      if (p) {
        svg += `<path d="${p}" fill="${a.item.color}"/>`;
        if (showLabels && (a.end - a.start) > 18) {
          const pos = polarToCart((a.start + a.end) / 2, (outerR1 + outerR2) / 2);
          svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" fill="${a.item.font_color}" font-size="10" font-weight="bold">${formatW(a.item.value)}</text>`;
        }
      }
    }

    // Inner arcs (suppliers)
    for (const a of this._prevSupplierAngles) {
      const p = arcPath(a.start, a.end, innerR1, innerR2);
      if (p) {
        svg += `<path d="${p}" fill="${a.item.color}"/>`;
        if (showLabels && (a.end - a.start) > 18) {
          const pos = polarToCart((a.start + a.end) / 2, (innerR1 + innerR2) / 2);
          svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" fill="${a.item.font_color}" font-size="10" font-weight="bold">${formatW(a.item.value)}</text>`;
        }
      }
    }

    // Center
    svg += `<text x="${cx}" y="${cy - 14}" text-anchor="middle" fill="var(--primary-text-color)" font-size="10" opacity="0.7">${centerLabel}</text>`;
    svg += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" fill="var(--primary-text-color)" font-size="15" font-weight="bold">${formatW(centerValue)}</text>`;
    svg += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="var(--secondary-text-color)" font-size="9">${secondaryLabel} ${formatW(secondaryValue)}</text>`;

    // Render
    if (!this._svg) {
      this.innerHTML = `
        <ha-card header="${config.title || ''}">
          <div style="padding: 0 16px 12px; text-align:center;${config.title ? '' : 'padding-top:12px;'}">
            <svg class="dgc-svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;"></svg>
            <div class="dgc-legend" style="margin-top:2px;line-height:1.6;"></div>
          </div>
        </ha-card>
      `;
      this._svg = this.querySelector('.dgc-svg');
      this._legendEl = this.querySelector('.dgc-legend');
    }

    this._svg.innerHTML = svg;

    // Legend
    const allItems = [...consumers, ...suppliers];
    this._legendEl.innerHTML = showLegend ? allItems.map(i => `<span style="margin:0 5px;font-size:11px;white-space:nowrap;"><span style="color:${i.color}">●</span> ${i.name}: ${formatW(i.value)}</span>`).join('') : '';
  }

  getCardSize() { return 4; }

  static getStubConfig() {
    return {
      title: "Energy Balance",
      house_entity: "sensor.house_power_consumption",
      solar_entity: "sensor.growatt_zgq0f6g1bk_pv_power",
      grid_entity: "sensor.ltibber_0100100700ff",
      battery_entities: ["sensor.venus_e_3_0_battery_power", "sensor.venus_e_3_0_device_2_battery_power"],
      price_level_entity: "sensor.balint_current_price_level",
      price_entity: "sensor.balint_hourly_price_current"
    };
  }
}

customElements.define('dual-gauge-card', DualGaugeCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'dual-gauge-card', name: 'Dual Gauge Card', description: 'Energy consumption and supply as dual half-circle gauges' });
