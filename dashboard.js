const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'EGP', maximumFractionDigits:0}).format(n || 0);
const number = n => new Intl.NumberFormat('en-US').format(n || 0);
const params = () => {
  const p = new URLSearchParams();
  p.set('branch', document.getElementById('branchFilter').value);
  p.set('start', document.getElementById('startDate').value);
  p.set('end', document.getElementById('endDate').value);
  return p.toString();
};
async function getData(endpoint) {
  const response = await fetch(`/api/${endpoint}?${params()}`);
  if (!response.ok) throw new Error(`Could not load ${endpoint}`);
  return response.json();
}
async function loadBranches() {
  const branches = await fetch('/api/branches').then(r => r.json());
  const select = document.getElementById('branchFilter');
  branches.forEach(b => {
    const option = document.createElement('option');
    option.value = b.id; option.textContent = b.name; select.appendChild(option);
  });
}
function makeRoot(id) {
  const root = am5.Root.new(id);
  root.setThemes([am5themes_Animated.new(root)]);
  return root;
}
let roots = [];
function clearCharts(){ roots.forEach(r => r.dispose()); roots = []; }
function createTrend(data) {
  const root = makeRoot('trendChart'); roots.push(root);
  const chart = root.container.children.push(am5xy.XYChart.new(root,{panX:false,panY:false,wheelX:'none',wheelY:'none',layout:root.verticalLayout}));
  const xRenderer = am5xy.AxisRendererX.new(root,{minGridDistance:30});
  xRenderer.labels.template.setAll({fontSize:10,fill:am5.color(0x8792a5)});
  const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root,{categoryField:'month',renderer:xRenderer}));
  xAxis.data.setAll(data);
  const yRenderer = am5xy.AxisRendererY.new(root,{});
  yRenderer.labels.template.setAll({fontSize:10,fill:am5.color(0x8792a5)});
  const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root,{renderer:yRenderer}));
  function addSeries(name, field, color) {
    const s = chart.series.push(am5xy.LineSeries.new(root,{name,xAxis,yAxis,valueYField:field,categoryXField:'month',stroke:am5.color(color),fill:am5.color(color),tooltip:am5.Tooltip.new(root,{labelText:'{name}: {valueY}'})}));
    s.strokes.template.setAll({strokeWidth:2.5});
    s.bullets.push(()=>am5.Bullet.new(root,{sprite:am5.Circle.new(root,{radius:3,fill:am5.color(color),stroke:root.interfaceColors.get('background'),strokeWidth:2})}));
    s.data.setAll(data);
  }
  addSeries('Revenue','sales',0x536dfe); addSeries('Profit','profit',0x25b987);
  chart.set('cursor',am5xy.XYCursor.new(root,{}));
  const legend=chart.children.push(am5.Legend.new(root,{centerX:am5.p50,x:am5.p50}));
  legend.data.setAll(chart.series.values);
}
function createBranch(data) {
  const root=makeRoot('branchChart'); roots.push(root);
  const chart=root.container.children.push(am5xy.XYChart.new(root,{layout:root.verticalLayout}));
  const xR=am5xy.AxisRendererX.new(root,{minGridDistance:25});xR.labels.template.setAll({fontSize:9,rotation:-25,centerY:am5.p50,centerX:am5.p100});
  const x=chart.xAxes.push(am5xy.CategoryAxis.new(root,{categoryField:'branch',renderer:xR}));x.data.setAll(data);
  const y=chart.yAxes.push(am5xy.ValueAxis.new(root,{renderer:am5xy.AxisRendererY.new(root,{})}));
  const s=chart.series.push(am5xy.ColumnSeries.new(root,{xAxis:x,yAxis:y,valueYField:'sales',categoryXField:'branch',tooltip:am5.Tooltip.new(root,{labelText:'{categoryX}: {valueY} EGP'})}));
  s.columns.template.setAll({cornerRadiusTL:5,cornerRadiusTR:5,strokeOpacity:0,fill:am5.color(0x7185ff)});s.data.setAll(data);
}
function createCategory(data) {
  const root=makeRoot('categoryChart');roots.push(root);
  const chart=root.container.children.push(am5percent.PieChart.new(root,{layout:root.verticalLayout,innerRadius:am5.percent(58)}));
  const series=chart.series.push(am5percent.PieSeries.new(root,{valueField:'sales',categoryField:'category',alignLabels:false}));
  series.labels.template.setAll({fontSize:10,fill:am5.color(0x657187)});series.slices.template.setAll({stroke:am5.color(0xffffff),strokeWidth:2,tooltipText:'{category}: {value} EGP'});
  series.data.setAll(data);
  const legend=chart.children.push(am5.Legend.new(root,{centerX:am5.p50,x:am5.p50,layout:root.horizontalLayout}));
  legend.labels.template.setAll({fontSize:10});legend.data.setAll(series.dataItems);
}
function createProducts(data) {
  const root=makeRoot('productsChart');roots.push(root);
  const chart=root.container.children.push(am5xy.XYChart.new(root,{layout:root.verticalLayout,panX:false,panY:false}));
  const yR=am5xy.AxisRendererY.new(root,{inversed:true, minGridDistance:20});yR.labels.template.setAll({fontSize:10,fill:am5.color(0x657187)});
  const y=chart.yAxes.push(am5xy.CategoryAxis.new(root,{categoryField:'product',renderer:yR}));y.data.setAll(data);
  const x=chart.xAxes.push(am5xy.ValueAxis.new(root,{renderer:am5xy.AxisRendererX.new(root,{})}));
  const s=chart.series.push(am5xy.ColumnSeries.new(root,{xAxis:x,yAxis:y,valueXField:'revenue',categoryYField:'product',tooltip:am5.Tooltip.new(root,{labelText:'{categoryY}: {valueX} EGP'})}));
  s.columns.template.setAll({height:am5.percent(55),cornerRadiusTR:5,cornerRadiusBR:5,strokeOpacity:0,fill:am5.color(0x25b987)});s.data.setAll(data);
}
async function refresh() {
  const [summary,trend,branches,categories,products]=await Promise.all([
    getData('summary'),getData('monthly-sales'),getData('sales-by-branch'),getData('category-sales'),getData('top-products')
  ]);
  document.getElementById('revenue').textContent=money(summary.revenue);
  document.getElementById('profit').textContent=money(summary.profit);
  document.getElementById('units').textContent=number(summary.units);
  document.getElementById('orders').textContent=number(summary.orders);
  clearCharts();
  createTrend(trend);createBranch(branches);createCategory(categories);createProducts(products);
}
document.getElementById('applyFilters').addEventListener('click',()=>{
  const start=document.getElementById('startDate').value,end=document.getElementById('endDate').value;
  if(start && end && start>end){alert('The start date must be before the end date.');return;}
  refresh().catch(err=>alert(err.message));
});
loadBranches().then(refresh).catch(err=>alert(err.message));
