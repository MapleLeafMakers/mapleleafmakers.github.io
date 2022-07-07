/**
 * This is an advanced demo of setting up Highcharts with the flags feature borrowed from Highcharts Stock.
 * It also shows custom graphics drawn in the chart area on chart load.
 */


/**
 * Fires on chart load, called from the chart.events.load option.
 */

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
 function humanFileSize(bytes, si=false, dp=1) {
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
  
    const units = si 
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10**dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
  
    return bytes.toFixed(dp) + ' ' + units[u];
  }

 const options = {
    chart: {
        zoomType: 'x',
    },
    labels: {
        style: {
            color: '#ffffff'
        }
    },
    xAxis: {
        plotBands: [],
        labels: {
            align: 'left'
        },       
    },
    title: {
        text: ''
    },
    credits: {
        enabled: false
    },
    yAxis: [{
        labels: {
            enabled: true
        },
        title: {
            text: 'Probe Z'
        },
        gridLineColor: 'rgba(0, 0, 0, 0.07)'
    }, {
        labels: {
            enabled: true,
        },
        title: {
            text: 'temperature (&deg;C)',
        },
        opposite: true
    }
    ],
   
    tooltip: {
        width: 500,
        shared: true,
        crosshairs: true,
        useHTML: true,
        headerFormat: `<table class='tooltip'>`,
        footerFormat: `</table>`,
        pointFormatter: function (pt) {
            const pbx = this.x;
            let plotBand = this.series.chart.xAxis[0].plotLinesAndBands.filter(pb => pb.options.from <= pbx && pb.options.to > pbx)[0];
            let extra;
            if (plotBand !== undefined) {
                extra = plotBand.options.extra
            }
            let row = '';
            if (this.series.name == 'Probe Z') {
                // insert header before first row
                row = `<tr><th colspan=2>PROBE_ACCURACY AT X: ${extra.x}, Y: ${extra.y}</th></tr>`
                row += `<tr><td>Sample: </td><td>${this.x - plotBand.options.from} / ${ extra.samples }</td></tr>`
                row += `<tr><td>Speed: </td><td>${extra.speed}mm/s</td></tr>`
                row += `<tr><td>Lift Speed: </td><td>${extra.lift_speed}mm/s</td></tr>`
            }
            row += `<tr><td>${ this.series.name }</td><td>${this.y}${this.series.options.valueSuffix}</td></tr>`
            return row;
        }
    },
    series: [{
        type: 'line',
        id: 'probes',
        name: 'Probe Z',
        valueSuffix: 'mm',
        data: [
        ],
        lineWidth: 0,
        marker: { enabled: true },
    }]
    
};

function processLog(log) {
    const lines = log.split('\n');
    const plotBands = [];
    const probeData = [];
    const tempData = {};
    let temps = {};
    let probeCount = 0;
    lines.forEach((l) => {
        let m = l.match(/PROBE_ACCURACY at X:(?<x>-?\d+\.\d+) Y:(?<y>-?\d+\.\d+) Z:(?<z>-?\d+\.\d+) \(samples=(?<samples>\d+) retract=(?<retract>\d+\.\d+) speed=(?<speed>\d+\.\d+) lift_speed=(?<lift_speed>\d+\.\d+)/);
        // identify probe accuracy runs.
        if (m != null) {
            const pa = {
                x: parseFloat(m.groups.x), 
                y: parseFloat(m.groups.y), 
                z: parseFloat(m.groups.z), 
                samples: parseInt(m.groups.samples), 
                retract: parseFloat(m.groups.retract), 
                speed: parseFloat(m.groups.speed), 
                lift_speed: parseFloat(m.groups.lift_speed)
            };
            
            plotBands.push({ 
                from: probeCount, 
                to: probeCount+pa.samples,
                color: (plotBands.length % 2 == 0 ? '#EFFFFF' : '#FFFFEF'),
                extra: pa,
                borderWidth: 1,
                borderColor: '#ffffff',
            });
            return;
        }
        m = l.match(/probe at (?<x>-?\d+\.\d+),(?<y>-?\d+\.\d+) is z=(?<z>-?\d+\.\d+)/);
        if (m != null) {
            for (const key in temps) {
                if (tempData[key] === undefined) {
                    tempData[key] = [];
                }
                tempData[key].push([probeCount, temps[key]]);
            }
            probeData.push([probeCount++, parseFloat(m.groups.z)]);
            return;
        }

        m = l.match(/Stats \d+\.\d: (?<stats>.*)$/)
        if (m != null) {
            let groups = [...m.groups.stats.matchAll(/\w+:\s(?:\w+=\S+\s+)+/g)].filter(gm => gm[0].indexOf('temp=') !== -1).map(gm => gm[0]);
            groups.forEach(g => {
                const k = g.split(':')[0];
                const val = parseFloat(g.match(/\stemp=(?<temp>-?\d+.\d+)/).groups.temp);
                temps[k] = val;
            });
            return;
        }
    });
    return { data: probeData, temps: tempData, plotBands: plotBands };
}

const chart = Highcharts.chart('container', options);
const fileInput = document.getElementById('log_file');
const fileInfoSpan = document.querySelector('#fileinfo');
const clearButton = document.querySelector('#clearfile');
clearButton.addEventListener('click', function () {
    fileInput.value = null;
    document.querySelector('#container').classList.add('hidden');
    document.querySelector('.header').classList.add('hidden');
    document.querySelector('#help').classList.add('hidden');
    document.querySelector('.drag-area').classList.remove('hidden');
});
function loadLogs() {
    
    document.querySelector('.drag-area').classList.add('hidden');
    document.getElementById('container').classList.remove('hidden');
    document.querySelector('.header').classList.remove('hidden');
    document.getElementById('help').classList.remove('hidden');
    console.log(fileInfoSpan); //.text = fileInput.files[0].name;
    fileInfoSpan.textContent = fileInput.files[0].name + ' (' + humanFileSize(fileInput.files[0].size) + ') ';
    if (fileInput.files.length > 0) {        
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {            
            const { plotBands, temps, data} = processLog(event.target.result);
            chart.series[0].setData(data);
            for (let i=chart.series.length-1; i > 0; i--) {
                chart.series[i].remove();
            }
            for (const key in temps) {
                chart.addSeries({
                    type: 'spline',
                    data: temps[key],
                    name: key,
                    yAxis: 1,
                    visible: false,
                    valueSuffix: '&deg;C',
                    marker: { enabled: false },
                }, false)
            }
            chart.xAxis[0].plotLinesAndBands.forEach(pb => chart.xAxis[0].removePlotBand(pb));
            chart.xAxis[0].plotLinesAndBands.forEach(pb => chart.xAxis[0].removePlotBand(pb));
            plotBands.forEach(pb => chart.xAxis[0].addPlotBand(pb, false));
            chart.redraw();
            
        });
        reader.readAsText(fileInput.files[0]);
    }
};

//selecting all required elements
const dropArea = document.querySelector(".drag-area"),
dragText = dropArea.querySelector("header"),
button = dropArea.querySelector("button");
let file; //this is a global variable and we'll use it inside multiple functions
button.onclick = ()=>{
  fileInput.click(); //if user click on the button then the input also clicked
}
fileInput.addEventListener("change", function(){
  //getting user select file and [0] this means if user select multiple files then we'll select only the first one
  file = this.files[0];
  dropArea.classList.add("active");
  loadLogs(); //calling function
});
//If user Drag File Over DropArea
dropArea.addEventListener("dragover", (event)=>{
  event.preventDefault(); //preventing from default behaviour
  dropArea.classList.add("active");
  dragText.textContent = "Release to Upload File";
});
//If user leave dragged File from DropArea
dropArea.addEventListener("dragleave", ()=>{
  dropArea.classList.remove("active");
  dragText.textContent = "Drag & Drop to Upload File";
});
//If user drop File on DropArea
dropArea.addEventListener("drop", (event)=>{
  event.preventDefault(); //preventing from default behaviour
  //getting user select file and [0] this means if user select multiple files then we'll select only the first one
  file = event.dataTransfer.files[0];
  loadLogs(); //calling function
});

