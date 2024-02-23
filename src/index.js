let data;
let i; // activity index
let j; // point index
let activity_len;
let ppl; // adjust speed by points per loop
let bs; // buffer size: this determins the tail length
let bx;
let by;
let bi;
let lines;
let fireFlies;
let baseLayer;
let distHist;
let mainColor;
let width;
let height;
let position;
let mapboxToken;
let backendPrefix = "/firefly_animation_data/2023";

const maxDimension = 1280; // The maximum width or height of Mapbox static image are 1280;
function determin_dimension_position() {
  let w = windowWidth;
  let h = windowHeight;
  const scale = (a, b) =>
    a > maxDimension
      ? [maxDimension, Math.floor((b / a) * maxDimension)]
      : [a, b];
  if (w >= h) {
    [w, h] = scale(w, h);
  } else {
    [h, w] = scale(h, w);
  }
  let p = [0, 0];
  if (w < windowWidth) {
    p = [Math.floor((windowWidth - w) / 2), Math.floor((windowHeight - h) / 2)];
  }
  return [[w, h], p];
}

class Hist {
  constructor(boundaries) {
    this.boundaries = boundaries;
    this.numBucket = this.boundaries.length + 1;
    this.buckets = Array(this.numBucket).fill(0);
  }
  add(x) {
    let i = 0;
    for (; i < this.boundaries.length; i++) {
      if (x < this.boundaries[i]) {
        break;
      }
    }
    this.buckets[i]++;
  }
  report() {
    let ret = [
      {
        name: `<${this.boundaries[0]}`,
        count: this.buckets[0],
      },
    ];
    for (let i = 0; i < this.boundaries.length; i++) {
      ret.push({
        name: `>${this.boundaries[i]}`,
        count: this.buckets[i + 1],
      });
    }
    return ret;
  }
}

class FireFly {
  constructor(x, y, mr) {
    this.x = x;
    this.y = y;
    this.mr = mr;
    this.life = 255;
    this.r = random(0, 1) * mr;
    this.theta = random(0, 2 * Math.PI);
    this.ax = this.r * Math.cos(this.theta);
    this.ay = this.r * Math.sin(this.theta);
    this.vx = this.ax * -10;
    this.vy = this.ay * -10;
    this.dlife = random(-20, -10);
  }
  move() {
    this.x = this.x + this.vx;
    this.y = this.y + this.vy;
    this.vx = this.vx + this.ax;
    this.vy = this.vy + this.ay;
    if (this.vx * this.ax > 0) {
      this.vx = 0;
    }
    if (this.vy * this.ay > 0) {
      this.vy = 0;
    }
    this.life = this.life + this.dlife;
    if (this.life < 0) {
      this.life = 0;
    }
  }
  display() {
    if (this.x >= 0 && this.x < width && this.y >= 0 && this.y < height) {
      let r = Math.sqrt(this.life) * this.mr * 2;
      stroke(...mainColor, 10);
      strokeWeight(0.5);
      fill(...mainColor, this.life / 10);
      ellipse(this.x, this.y, r, r);
    }
  }
}

const gpsRectConvert = (rect) => [rect[0], rect[2], rect[1], rect[3]];

const defaultConfig = {
  city: "Hong Kong",
  lon: 114.134709835052,
  lat: 22.3549875359928,
  zoom: 10,
};

function preload() {
  [[width, height], position] = determin_dimension_position();

  const urlParams = Object.fromEntries(
    new URLSearchParams(window.location.search)
  );
  const { city, lon, lat, zoom } = { ...defaultConfig, ...urlParams };
  let center = [lon, lat];
  const bbox = geoViewport.bounds(
    center,
    parseFloat(zoom),
    [width, height],
    512
  );
  console.log(bbox);
  let gpsRect = gpsRectConvert(bbox);
  console.log(gpsRect);

  let bg = createImg(
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${center},${zoom}/${width}x${height}@2x?access_token=${mapboxToken}`
  );
  bg.position(...position);
  bg.size(width, height);
  bg.style("z-index", "-1");

  let dataUrl = `${backendPrefix}/${gpsRect.join(",")}/${width},${height}/`;
  console.log(dataUrl);
  data = loadJSON(dataUrl);
}

function setup() {
  textFont("Courier New");
  canvas = createCanvas(width, height);
  canvas.position(...position);
  baseLayer = get();

  // Set the major style
  bs = 500;
  mainColor = [100, 250, 155];
  ppl = 20;

  strokeWeight(1.5);
  stroke(...mainColor, 150);
  fill(...mainColor, 200);
  i = 0;
  j = 0;

  bx = Array(bs).fill(0);
  by = Array(bs).fill(0);
  fireFlies = Array(bs);
  for (k = 0; k < bs; k++) {
    fireFlies[k] = new FireFly(-1000, -1000);
  }
  bi = 0;

  // the loadJSON returns array in a dict format
  activity_len = Object.keys(data).length;

  distHist = new Hist([5, 10, 20, 40, 80]);
}

function drawAllPath() {
  push();
  clear();
  strokeWeight(0.5);
  stroke(0, 150, 100, 150);
  for (i = 0; i < activity_len; i++) {
    let polyline = data[i]["canvas_polyline"];
    for (j = 0; j < polyline.length - 1; j++) {
      let pos1 = polyline[j];
      let pos2 = polyline[j + 1];
      line(pos1[0], pos1[1], pos2[0], pos2[1]);
    }
  }
  pop();
}

function keyPressed() {
  //Saves Canvas as a PNG.
  if (keyCode == 32) {
    saveCanvas("", "png");
  }
}

function drawFrameRate() {
  text(`FPS: ${parseInt(frameRate())}`, 10, height);
}

function drawWaterMark() {
  text(`https://RunArt.net`, 10, height - 30);
}

// static
function draw() {
  clear();
  image(baseLayer, 0, 0, width, height);
  for (k = 0; k < ppl; k++) {
    let polyline = data[i]["canvas_polyline"];
    let pos1 = polyline[j];
    let pos2 = polyline[j + 1];
    push();
    stroke(...mainColor, 100);
    fill(...mainColor, 100);
    strokeWeight(1);
    line(pos1[0], pos1[1], pos2[0], pos2[1]);
    pop();
    fireFlies[bi] = new FireFly(
      polyline[j][0],
      polyline[j][1],
      data[i]["distance"] / (50 * 1000)
      // 0.5
    );
    bi = bi + 1;
    if (bi >= bs) {
      bi = 0;
    }

    j = j + 1;
    if (j >= data[i]["canvas_polyline"].length - 1) {
      j = 0;
      distHist.add(data[i]["distance"] / 1000);
      if (i + 1 >= activity_len) {
        noLoop();
        break;
      }
      i = i + 1;
    }
  }

  baseLayer = get();

  for (k = 0; k < fireFlies.length; k++) {
    fireFlies[k].display();
    fireFlies[k].move();
  }

  push();
  fill(0);
  stroke(0);
  pop();
  push();
  strokeWeight(1);
  textFont("Courier New");
  stroke(...mainColor, 255);
  strokeWeight(1);
  distProfile = distHist.report();
  text(
    `${data[i]["start_date_str"]}\n` +
      `#: ${i + 1}\n` +
      `→: ${data[i]["cum_distance"]} KM\n` +
      `↗: ${data[i]["cum_ascent"]} KM\n` +
      `T: ${data[i]["cum_et"]} hr\n`,
    width - 100,
    height - 90
  );

  let distProfileStartY = 40;
  for (k = 0; k < distProfile.length; k++) {
    let p = distProfile[k];
    text(`${p.name}`, 10, distProfileStartY + 20 * k);
    text(`${p.count}`, 10 + 30 + 5 + p.count * 1.5, distProfileStartY + 20 * k);
    fill(...mainColor);
    rect(10 + 30, distProfileStartY - 10 + 20 * k, p.count * 1.5, 18);
  }

  drawWaterMark();
  pop();
}