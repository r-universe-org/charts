/* Fill table */
function get_path(path){
  return new Promise(function(resolve, reject) {
    $.ajax(path).done(function(txt){
      resolve(txt);
    }).fail((jqXHR, textStatus) => reject("GET " + path + "\nHTTP "
      + jqXHR.status + "\n\n" + jqXHR.responseText));
  });
}

function get_ndjson(path){
  return get_path(path).then(txt => txt.split('\n').filter(x => x.length).map(JSON.parse));
}

function sort_packages(array){
  return array.sort((a, b) => (a.count > b.count) ? -1 : 1).map(x => x.upstream.split(/[\\/]/).pop());
}

function file_to_data(url, cb){
  fetch(url).then(r => r.blob()).then(blob => {
    var reader = new FileReader();
    reader.onload = function() {
      cb(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

function makechart(universe, max, imsize){
  get_ndjson(`https://${universe && universe + "." || ""}r-universe.dev/stats/contributors?limit=${max || 100}`).then(function(contributors){
    const size = imsize || 50;
    const logins = contributors.map(x => x.login);
    const totals = contributors.map(x => x.total);
    const counts = contributors.map(x => sort_packages(x.repos));
    const avatars = logins.map(x => `https://r-universe.dev/avatars/${x.replace('[bot]', '')}.png?size=${size}`);

    //substitute avatar urls with their base64 data, hopefully this makes re-rendering a bit faster
    /*
    avatars.forEach(function (url, index) {
      file_to_data(url, function(blob){
        avatars[index] = blob;
      });
    });
    */
    
    const ctx = document.getElementById('myChart');
    $(ctx).height(logins.length * (size + 10));
    ctx.onclick = function(e){
      const pts = myChart.getElementsAtEventForMode(e, 'nearest', {intersect: true}, true);
      if(pts.length){
        const x = pts[0];
        const user = logins[x.index];
        window.open(`https://${user}.r-universe.dev`, "_blank");
      }
    };

    function render_avatars(chart){
      var xAxis = chart.scales.x;
      var yAxis = chart.scales.y;
      yAxis.ticks.forEach((value, index) => {
        var y = yAxis.getPixelForTick(index);
        var image = new Image();
        image.src = avatars[index];
        chart.ctx.drawImage(image, xAxis.left - size - 105, y - size/2, size, size);
      });
    }

    const myChart = new Chart(ctx, {
      type: 'bar',
      plugins: [{
        afterDraw: render_avatars
      }],
      data: {
        labels: logins,
        datasets: [{
          label: 'contributions',
          data: totals,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          minBarLength: 10
        }]
      },
      options: {
        //events: ['resize'], //disable all hover events, much faster (but no tooltips)
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins : {
          legend: false,
          title: {
            display: true,
            text: `Top contributors ${universe && "to " + universe}`
          },
          tooltip: {
            callbacks: {
              label: function(item) {
                let packages = counts[item.dataIndex];
                let len = packages.length;
                if(len > 5){
                  return ` Contributed to ${packages.slice(0,4).join(', ')} and ${packages.length-4} other packages`;
                } else if(len > 1) {
                  return ` Contributed to ${packages.slice(0,len-1).join(', ')} and ${packages[len-1]}`;
                } else {
                  return ` Contributed to ${packages[0]}`;
                }
              }
            }
          }
        },
        layout: {
          padding: {
            left: 70
          }
        },
        scales: {
          y: { 
            ticks: {
              //padding: 60,              
              beginAtZero: true,
            }
          },
          x: {
            ticks: {
              //maxRotation: 90,
              //minRotation: 90,
              display: true,
            }   
          },
        }
      }
    });

    /* Hacks to force rendering pictures because of bugs in chrome/chartjs */
    const render_delayed = debounce(() => render_avatars(myChart))
    $(window).resize(render_delayed);
    render_delayed();

  });
}

function debounce(func, timeout = 500){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

makechart('ropensci', 100)
