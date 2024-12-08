function getChartColorsArray(r) {
	if (null !== document.getElementById(r)) {
		var t = document.getElementById(r).getAttribute("data-colors");
		if (t) return (t = JSON.parse(t)).map(function(r) {
			var t = r.replace(" ", "");
			if (-1 === t.indexOf(",")) {
				var e = getComputedStyle(document.documentElement).getPropertyValue(t);
				return e || t
			}
			var a = r.split(",");
			return 2 != a.length ? t : "rgba(" + getComputedStyle(document.documentElement).getPropertyValue(a[0]) + "," + a[1] + ")"
		})
	}
}
var options1, chart1, BarchartTotalReveueColors = getChartColorsArray("total-revenue-chart");
BarchartTotalReveueColors && (options1 = {
	series: [{
		data: [25, 66, 41, 89, 63, 25, 44, 20, 36, 40, 54]
	}],
	fill: {
		colors: BarchartTotalReveueColors
	},
	chart: {
		type: "bar",
		width: 70,
		height: 40,
		sparkline: {
			enabled: !0
		}
	},
	plotOptions: {
		bar: {
			columnWidth: "50%"
		}
	},
	labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	xaxis: {
		crosshairs: {
			width: 1
		}
	},
	tooltip: {
		fixed: {
			enabled: !1
		},
		x: {
			show: !1
		},
		y: {
			title: {
				formatter: function(r) {
					return ""
				}
			}
		},
		marker: {
			show: !1
		}
	}
}, (chart1 = new ApexCharts(document.querySelector("#total-revenue-chart"), options1)).render());
var RadialchartOrdersChartColors = getChartColorsArray("orders-chart");
RadialchartOrdersChartColors && (options = {
	fill: {
		colors: RadialchartOrdersChartColors
	},
	series: [70],
	chart: {
		type: "radialBar",
		width: 45,
		height: 45,
		sparkline: {
			enabled: !0
		}
	},
	dataLabels: {
		enabled: !1
	},
	plotOptions: {
		radialBar: {
			hollow: {
				margin: 0,
				size: "60%"
			},
			track: {
				margin: 0
			},
			dataLabels: {
				show: !1
			}
		}
	}
}, (chart = new ApexCharts(document.querySelector("#orders-chart"), options)).render());
var RadialchartCustomersColors = getChartColorsArray("customers-chart");
RadialchartCustomersColors && (options = {
	fill: {
		colors: RadialchartCustomersColors
	},
	series: [55],
	chart: {
		type: "radialBar",
		width: 45,
		height: 45,
		sparkline: {
			enabled: !0
		}
	},
	dataLabels: {
		enabled: !1
	},
	plotOptions: {
		radialBar: {
			hollow: {
				margin: 0,
				size: "60%"
			},
			track: {
				margin: 0
			},
			dataLabels: {
				show: !1
			}
		}
	}
}, (chart = new ApexCharts(document.querySelector("#customers-chart"), options)).render());
var options2, chart2, BarchartGrowthColors = getChartColorsArray("growth-chart");
BarchartGrowthColors && (options2 = {
	series: [{
		data: [25, 66, 41, 89, 63, 25, 44, 12, 36, 9, 54]
	}],
	fill: {
		colors: BarchartGrowthColors
	},
	chart: {
		type: "bar",
		width: 70,
		height: 40,
		sparkline: {
			enabled: !0
		}
	},
	plotOptions: {
		bar: {
			columnWidth: "50%"
		}
	},
	labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	xaxis: {
		crosshairs: {
			width: 1
		}
	},
	tooltip: {
		fixed: {
			enabled: !1
		},
		x: {
			show: !1
		},
		y: {
			title: {
				formatter: function(r) {
					return ""
				}
			}
		},
		marker: {
			show: !1
		}
	}
}, (chart2 = new ApexCharts(document.querySelector("#growth-chart"), options2)).render());
