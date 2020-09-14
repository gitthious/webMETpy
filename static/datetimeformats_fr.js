/*
encoding utf-8
© Thierry hervé
*/

var locale = d3.timeFormatLocale({
  "dateTime": "%x, %X",
  "date": "%d/%m/%Y",
  "time": "%H:%M:%S",
  "periods": ["AM", "PM"],
  "days": ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  "shortDays": ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "décembre"],
  "shortMonths": ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jlt", "Aou", "Sep", "Oct", "Nov", "Déc"]
});

var formatMillisecond = locale.format(".%L"),
    formatSecond = locale.format(":%S"),
    formatMinute = locale.format("%H:%M"),
    formatHour = locale.format("%H:%M"),
    formatDay = locale.format("%a %e"),
    formatWeek = locale.format("S%V"),
    formatMonth = locale.format("%b"),
    formatYear = locale.format("%Y");
/*
On peut les récupérer sur internet

d3.json("https://unpkg.com/d3-time-format@2/locale/ru-RU.json", function(error, locale) {
  if (error) throw error;

  d3.timeFormatDefaultLocale(locale);
}
*/
function multiFormat(date) {
  return (d3.timeSecond(date) < date ? formatMillisecond
      : d3.timeMinute(date) < date ? formatSecond
      : d3.timeHour(date) < date ? formatMinute
      : d3.timeDay(date) < date ? formatHour
      : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
      : d3.timeYear(date) < date ? formatMonth
      : formatYear)(date);
}


var durationSecond = 1000,
    durationMinute = durationSecond * 60,
    durationHour = durationMinute * 60,
    durationDay = durationHour * 24,
    durationWeek = durationDay * 7,
    durationMonth = durationDay * 30,
    durationYear = durationDay * 365; // bug pour les années bissectiles

  var tickIntervals = [
    [d3.timeSecond,  10, 10 * durationSecond],
    [d3.timeSecond,  30, 30 * durationSecond],
    [d3.timeMinute,   1,      durationMinute],
    [d3.timeMinute,   5,  5 * durationMinute],
    [d3.timeMinute,  15, 15 * durationMinute],
    [d3.timeMinute,  30, 30 * durationMinute],
    [d3.timeHour,     1,      durationHour  ],
//    [d3.timeHour,     2,  2 * durationHour  ],
//    [d3.timeHour,     2,  4 * durationHour  ],
//    [d3.timeHour,     6,  6 * durationHour  ],
//    [d3.timeHour,     8,  8 * durationHour  ],
//    [d3.timeHour,    10, 10 * durationHour  ],
    [d3.timeHour,    12, 12 * durationHour  ],
    [d3.timeDay,      1,      durationDay   ],
    [d3.timeDay,      2,  2 * durationDay   ],
    [d3.timeWeek,     1,      durationWeek  ],
    [d3.timeMonth,    1,      durationMonth ],
    [d3.timeMonth,    3,  3 * durationMonth ],
    [d3.timeMonth,    4,  4 * durationMonth ],
    [d3.timeMonth,    6,  6 * durationMonth ],
    [d3.timeYear,     1,      durationYear  ],
    [d3.timeYear,    10, 10 * durationYear  ],
    [d3.timeYear,   100,100 * durationYear  ]
];

function tickInterval(interval, start, stop, step) {
    if (interval == null) interval = 10;
    if (typeof interval === "number") {
	  // voir explications sous https://stackoverflow.com/questions/26882631/d3-what-is-a-bisector
      var target = Math.abs(stop - start) / interval,
          i = d3.bisector(function(i) { return i[2]; }).right(tickIntervals, target);
       if (i >= tickIntervals.length) {
		step = d3.tickStep(start / durationYear, stop / durationYear, interval);
        interval = d3.timeYear;
      } else if (i === 0) {
        step = Math.max(d3.tickStep(start, stop, interval), 1);
		interval = d3.timeMillisecond;
      } else {
        i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
        step = i[1];
        interval = i[0];
      }
    }

    return step == null ? interval : interval.every(step);
  }

 function autmatic_ticks(domain) {
	interval = null;
	step = 1;
    var t0 = domain[0],
        t1 = domain[domain.length - 1],
        r = t1 < t0,
        t;
    if (r) t = t0, t0 = t1, t1 = t;
    t = tickInterval(interval, t0, t1, step);
	// bug avec t1 + 1, mais seulement dans ce code, 
	// pas dans d3.js. Voir "scale.ticks = function(interval, step) {"
	//t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
	//console.log(t0, t1)
	t = t ? t.range(t0, t1) : []; 
	return r ? t.reverse() : t;
  };