// load csv file
d3.csv("data/global_terrorism_small.csv").then(data => {
    
    // group data by year and count num rows per year
    const attacksByYear = d3.rollup(
        data,
        v => v.length,
        d => d.iyear
    );

    // translate to array
    const yearData = Array.from(attacksByYear, ([year, count]) => ({year: +year, count}))
                            .sort((a, b) => a.year - b.year);
    drawLineChart(yearData);

    // group data by country and sum nkill
    const deathsByCountry = d3.rollup(
        data,
        v => d3.sum(v, d => +d.nkill),
        d => d.country_txt
    );

    // convert to array, filter unwanted entries, sort array, extract top 10
    const topCountries = Array.from(deathsByCountry, ([country, total]) => ({country, total}))
        .filter(d => d.country && !isNaN(d.total))
        .sort((a, b) => b.total - a.total)
        .slice(0,10);
        
    drawBarChart(topCountries);

    // group by attack and target type, count num occurrences per pair
    const pairs = d3.rollups(
        data,
        v => v.length,
        d => d.attacktype1_txt,
        d => d.targtype1_txt
      );
      
      const attackTypes = new Set();
      const targetTypes = new Set();
      
      // populate sets with values from data
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
      
      // populate matrix with counts from attack/target combos
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

function drawLineChart(data){

    // sizing constants
    const width = 700;
    const height = 450;
    const margin = {top: 120, right: 30, bottom: 10, left: 70};

    // select desired div
    const svg = d3.select("#view1")
        .append("svg")
        .attr("height", height + 100)
        .attr("width", width );
    
        // linear scale for year
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([margin.left, width - margin.right]);
    
        // linear scale for attack toll
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height - margin.bottom, margin.top]);

        const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count));
    
        // draw line path using processed data
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
    
        // draw x axis at bottom
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));  
    
        // draw y axis on left
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    
        // chart title
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .text("Global Terrorist Attacks per Year");

        // x axis label
        svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom + 55)
        .attr("text-anchor", "middle")
        .text("Year");
      
        // y axis label
      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 - 40)
        .attr("y", margin.left - 55)
        .attr("text-anchor", "middle")
        .text("Number of Attacks");
 }

 function drawBarChart(data){
    // set constants for sizing
    const width = 600;
    const height = 350;
    const margin = {top: 30, right: 150, bottom: 135, left:75};

    // select the div from html
    const svg = d3.select("#view2")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

        // scaleband for country category
    const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([margin.left, width - margin.right])
        .padding(0.1);
    
        // linear scale for the death toll
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total)])
        .range([height - margin.bottom, margin.top]);

        // create bars
        svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.country))
        .attr("y", d => y(d.total))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - y(d.total))
        .attr("fill", "crimson");
    
      // x-axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end");
    
      // y-axis
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    
      // chart title
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top - 15)
        .attr("text-anchor", "middle")
        .text("Top 10 Countries by Deaths from Terrorism");

        // x axis title
        svg.append("text")
        .attr("x", width / 2 - 50)
        .attr("y", height - margin.bottom + 55)
        .attr("text-anchor", "middle")
        .text("Country");
      
      // y Axis title
      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 + 50)
        .attr("y", margin.left - 60)
        .attr("text-anchor", "middle")
        .text("Total Deaths");
}
 


function drawChordDiagram(matrix, labels) {
    // set sizing constants
    const width = 450;
    const height = 450;
    const innerRadius = 120;
    const outerRadius = innerRadius + 10;
  
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    // select the correct div from html
    const svg = d3.select("#view3")
      .append("svg")
      .attr("width", width + 300)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2 - 20} )`);
  
      // create chord layout generator
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);
  
      // arc generator for outer group arcs
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
  
      // ribbon generator for connecting lines
    const ribbon = d3.ribbon()
      .radius(innerRadius);
  
    const chords = chord(matrix);
  
    // draw outer arcs
    svg.append("g")
      .selectAll("path")
      .data(chords.groups)
      .enter()
      .append("path")
      .attr("fill", d => color(d.index))
      .attr("stroke", d => d3.rgb(color(d.index)).darker())
      .attr("d", arc);
  
      // add labels for each group
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
      
        // tilt one specific label for fitting purposes
        if (label === "Facility/Infrastructure Attack") {
          return `${base} ${flip} rotate(50)`;  // apply slight tilt AFTER normal rotation
        }
      
        return `${base} ${flip}`;
      })      
  
      // adjust label to fit window
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
      .text(d => {
        const label = labels[d.index];
        if (label === "Facility/Infrastructure Attack") return "Infrastructure";
        return label;
      });

    // draw connecting ribbons
    svg.append("g")
      .selectAll("path")
      .data(chords)
      .enter()
      .append("path")
      .attr("fill", d => color(d.target.index))
      .attr("stroke", d => d3.rgb(color(d.target.index)).darker())
      .attr("d", ribbon);

      // diagram title
      svg.append("text")
      .attr("x", outerRadius + 120)
      .attr("y", 0)  // move it above the circle
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Attack Types vs. Target Types");
    
  }
  