let topCountries = []; // make global

// load csv file
d3.csv("data/global_terrorism_small.csv").then(data => {

  // group data by year and count num rows per year
  const attacksByYear = d3.rollup(
    data,
    v => v.length,
    d => d.iyear
  );

  const yearData = Array.from(attacksByYear, ([year, count]) => ({ year: +year, count }))
    .sort((a, b) => a.year - b.year);
  drawLineChart(yearData);

  // group data by country and sum nkill
  const deathsByCountry = d3.rollup(
    data,
    v => d3.sum(v, d => +d.nkill),
    d => d.country_txt
  );

  topCountries = Array.from(deathsByCountry, ([country, total]) => ({ country, total }))
    .filter(d => d.country && !isNaN(d.total))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  drawBarChart(topCountries);

  // group by attack and target type, count num occurrences per pair
  const attackTypes = new Set();
  const targetTypes = new Set();

  data.forEach(d => {
    if (d.attacktype1_txt && d.targtype1_txt) {
      attackTypes.add(d.attacktype1_txt);
      targetTypes.add(d.targtype1_txt);
    }
  });

  const labels = Array.from(new Set([...attackTypes, ...targetTypes]));
  const indexMap = new Map(labels.map((name, i) => [name, i]));
  const matrix = Array.from({ length: labels.length }, () =>
    new Array(labels.length).fill(0)
  );

  data.forEach(d => {
    const a = d.attacktype1_txt;
    const t = d.targtype1_txt;
    if (indexMap.has(a) && indexMap.has(t)) {
      const i = indexMap.get(a);
      const j = indexMap.get(t);
      matrix[i][j] += 1;
    }
  });

  drawChordDiagram(matrix, labels);
});

function drawLineChart(data) {
    const width = 700;
    const height = 450;
    const margin = { top: 120, right: 30, bottom: 10, left: 70 };
  
    const svg = d3.select("#view1")
      .append("svg")
      .attr("width", width)
      .attr("height", height + 100);
  
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([margin.left, width - margin.right]);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([height - margin.bottom, margin.top]);
  
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count));
  
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "middle")
      .text("Global Terrorist Attacks per Year");
  
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - margin.bottom + 55)
      .attr("text-anchor", "middle")
      .text("Year");
  
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2 - 40)
      .attr("y", margin.left - 55)
      .attr("text-anchor", "middle")
      .text("Number of Attacks");
  
    // Add dots for all data points
    svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.count))
      .attr("r", 2)
      .attr("fill", "gray")
      .attr("opacity", 0.5);
  
    // Add brush
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on("end", brushed);
  
    svg.append("g")
      .attr("class", "brush")
      .call(brush);
  
    function brushed(event) {
      const selection = event.selection;
      if (!selection) return;
  
      const [x0, x1] = selection;
      const year0 = Math.round(x.invert(x0));
      const year1 = Math.round(x.invert(x1));
  
      // Remove previous highlights
      svg.selectAll(".highlight-circle").remove();
  
      // Add new highlighted dots
      const filtered = data.filter(d => d.year >= year0 && d.year <= year1);
  
      svg.selectAll(".highlight-circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("class", "highlight-circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 0)
        .attr("fill", "orange")
        .transition()
        .duration(400)
        .attr("r", 4);
  
        document.getElementById("selected-range").textContent = `Selected years: ${year0}–${year1}`;
    }
  }
  
function drawBarChart(data) {
    const width = 640;
    const height = 400;
    const margin = { top: 50, right: 160, bottom: 150, left: 60 };
  
    const defaultColor = "crimson";
    const highlightColor = "orange";
  
    // Create scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.country))
      .range([margin.left, width - margin.right])
      .padding(0.1);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total)]).nice()
      .range([height - margin.bottom, margin.top]);
  
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
  
    // Create SVG container
    const svg = d3.select("#view2")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Create tooltip 
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid black")
      .style("padding", "5px")
      .style("display", "none")
      .style("pointer-events", "none");
  
    // Append bars group
    const bars = svg.append("g")
      .attr("fill", defaultColor)
      .selectAll("rect")
      .data(data, d => d.country)
      .join("rect")
      .attr("x", d => x(d.country))
      .attr("y", d => y(d.total))
      .attr("height", d => y(0) - y(d.total))
      .attr("width", x.bandwidth())
      .style("mix-blend-mode", "multiply")
      .on("mouseover", function (event, d) {
        tooltip.style("display", "block")
          .html(`<strong>${d.country}</strong><br>Deaths: ${d.total.toLocaleString()}`);
        const bar = d3.select(this);
        if (!bar.classed("clicked")) bar.attr("fill", highlightColor);
      })
      .on("mousemove", event => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
        const bar = d3.select(this);
        if (!bar.classed("clicked")) bar.attr("fill", defaultColor);
      })
      .on("click", function () {
        const bar = d3.select(this);
        const isClicked = bar.classed("clicked");
        bar.classed("clicked", !isClicked);
        bar.attr("fill", isClicked ? defaultColor : highlightColor);
      });
  
    // Append the x-axis group and store with a specific class
    const gx = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);
    gx.selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");
  
    // Append the y-axis group
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);
  
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Top 10 Countries by Deaths from Terrorism");
  
    // Update function to resort bars and update the x-axis smoothly
    function update(order) {
      // Sort the data array in place
      data.sort(order);
  
      // Update the x-scale domain to reflect new order
      x.domain(data.map(d => d.country));
  
      // Transition bars to new x positions
      bars.transition()
        .duration(750)
        .delay((d, i) => i * 50)
        .attr("x", d => x(d.country));
  
      // Update the x-axis with the new scale
      svg.select(".x-axis")
        .transition()
        .duration(750)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");
    }
  
    // Hook up dropdown listener
    document.getElementById("sortOrder").addEventListener("change", function () {
      const val = this.value;
      let comparator;
      if (val === "ascending") comparator = (a, b) => d3.ascending(a.total, b.total);
      else if (val === "descending") comparator = (a, b) => d3.descending(a.total, b.total);
      else comparator = (a, b) => d3.ascending(a.country, b.country);
      update(comparator);
    });
  }
  

function drawChordDiagram(matrix, labels) {
  const width = 450;
  const height = 450;
  const innerRadius = 120;
  const outerRadius = innerRadius + 10;

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const svg = d3.select("#view3")
    .append("svg")
    .attr("width", width + 300)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2 - 20} )`);

  const chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending);

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const ribbon = d3.ribbon()
    .radius(innerRadius);

  const chords = chord(matrix);

  svg.append("g")
    .selectAll("path")
    .data(chords.groups)
    .enter()
    .append("path")
    .attr("fill", d => color(d.index))
    .attr("stroke", d => d3.rgb(color(d.index)).darker())
    .attr("d", arc);

  svg.append("g")
    .selectAll("text")
    .data(chords.groups)
    .enter()
    .append("text")
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr("dy", ".35em")
    .attr("transform", d => {
      d.angle = (d.startAngle + d.endAngle) / 2;
      const angle = d.angle * 180 / Math.PI - 90;
      const label = labels[d.index];
      const flip = d.angle > Math.PI ? "rotate(180)" : "";
      const base = `rotate(${angle}) translate(${outerRadius + 10})`;
      if (label === "Facility/Infrastructure Attack") {
        return `${base} ${flip} rotate(50)`;
      }
      return `${base} ${flip}`;
    })
    .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
    .text(d => {
      const label = labels[d.index];
      return label === "Facility/Infrastructure Attack" ? "Infrastructure" : label;
    });

  svg.append("g")
    .selectAll("path")
    .data(chords)
    .enter()
    .append("path")
    .attr("fill", d => color(d.target.index))
    .attr("stroke", d => d3.rgb(color(d.target.index)).darker())
    .attr("d", ribbon);

  svg.append("text")
    .attr("x", outerRadius + 120)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Attack Types vs. Target Types");
}
