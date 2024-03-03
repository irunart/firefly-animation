import { bounds } from "@mapbox/geo-viewport/geo-viewport.js";

const defaultConfig = {
  animation: {
    fireFlySize: 500,
    speed: 20,
  },
  theme: {
    mapStyle: "dark-v11",
    mainColor: [100, 250, 155],
  },
  geo: {
    city: "Hong Kong",
    lon: 114.134709835052,
    lat: 22.3549875359928,
    zoom: 10,
  },
  infiniteLoop: import.meta.env.FF_INIFINITE_LOOP,
};

const exampleGpx = import.meta.env.FF_EXAMPLE_GPX

const mergeConfigParams = (width, height) => {
  const urlParams = Object.fromEntries(
    new URLSearchParams(window.location.search)
  );
  const { loop } = urlParams;
  const infiniteLoop = loop || defaultConfig.infiniteLoop;

  const { city, lon, lat, zoom } = { ...defaultConfig.geo, ...urlParams };
  const center = { lon, lat };
  const bbox = bounds(center, parseFloat(zoom), [width, height], 512);
  const geo = { city, lon, lat, zoom, center, bbox }

  return {
    ...defaultConfig, geo, width, height,
    infiniteLoop: ["yes", "true", "1"].includes(infiniteLoop),
  };
};

const mapboxToken = import.meta.env.FF_MAPBOX_TOKEN;

const prepareMapBackground = (container, config) => {
  const {
    geo: {
      center: { lat, lon },
      zoom,
    },
    width,
    height,
    theme: { mapStyle },
  } = config;
  container.style(
    "background-image",
    `url(https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static` +
      `/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${mapboxToken})`
  );
  container.style("background-size", `${width}px ${height}px`);
  container.style("background-repeat", "no-repeat");
};

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
  constructor(p5, x, y, mr) {
    this.x = x;
    this.y = y;
    this.mr = mr;
    this.life = 255;
    this.r = p5.random(0, 1) * mr;
    this.theta = p5.random(0, 2 * Math.PI);
    this.ax = this.r * Math.cos(this.theta);
    this.ay = this.r * Math.sin(this.theta);
    this.vx = this.ax * -10;
    this.vy = this.ay * -10;
    this.dlife = p5.random(-20, -10);
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
  display(p5, config) {
    const {
      width,
      height,
      theme: { mainColor },
    } = config;
    if (this.x >= 0 && this.x < width && this.y >= 0 && this.y < height) {
      let r = Math.sqrt(this.life) * this.mr * 2;
      p5.stroke(...mainColor, 10);
      p5.strokeWeight(0.5);
      p5.fill(...mainColor, this.life / 10);
      p5.ellipse(this.x, this.y, r, r);
    }
  }
}

const buildDataUrl = (config) => {
  if (exampleGpx) {
    return exampleGpx;
  }
  const prefix =
    import.meta.env.FF_DATA_URL_PREFIX || "/firefly_animation_data/2023";
  const {
    width,
    height,
    geo: { bbox },
  } = config;
  const gpsRect = [bbox[0], bbox[2], bbox[1], bbox[3]];
  return `${prefix}/${gpsRect.join(",")}/${width},${height}/`;
};

const transformGpxData = (data, bbox, width, height) => Object.values(data).map(route => {
    const {canvas_polyline, ...rest} = route
    const line = canvas_polyline.map(([x, y]) => [(x - bbox[0]) / (bbox[2] - bbox[0]) * width,
    (bbox[3] - y) / (bbox[3] - bbox[1]) * height,
    ])
    return {canvas_polyline: line, ...rest};
  })

const fireflyAnimation = (p5, container, config) => {
  let activities;
  let currentActivity;
  let currentActivityPoint;
  let activityLen;
  let fireFlies;
  let fireflyIndex;
  let baseLayer;
  let distHist;
  const {
    width,
    height,
    geo,
    theme: { mainColor },
    animation: { fireFlySize, speed },
  } = config;

  const initFireFlies = () => {
    fireFlies = Array(fireFlySize);
    for (let k = 0; k < fireFlySize; k++) {
      fireFlies[k] = new FireFly(p5, -1000, -1000);
    }
    fireflyIndex = 0;
  };

  const populateFireFly = (firefly) => {
    fireFlies[fireflyIndex] = firefly;
    fireflyIndex = fireflyIndex + 1;
    if (fireflyIndex >= fireFlySize) {
      fireflyIndex = 0;
    }
  };

  const resetCanvas = () => {
    baseLayer = undefined;
    currentActivity = 0;
    currentActivityPoint = 0;
    initFireFlies();
    distHist = new Hist([5, 10, 20, 40, 80]);
    p5.clear();
  }

  const drawAllPath = () => {
    p5.push();
    p5.clear();
    p5.strokeWeight(0.5);
    p5.stroke(0, 150, 100, 150);
    for (
      currentActivity = 0;
      currentActivity < activityLen;
      currentActivity++
    ) {
      let polyline = activities[currentActivity]["canvas_polyline"];
      for (
        currentActivityPoint = 0;
        currentActivityPoint < polyline.length - 1;
        currentActivityPoint++
      ) {
        let pos1 = polyline[currentActivityPoint];
        let pos2 = polyline[currentActivityPoint + 1];
        p5.line(pos1[0], pos1[1], pos2[0], pos2[1]);
      }
    }
    p5.pop();
  };

  const drawFrameRate = () => {
    p5.text(`FPS: ${parseInt(frameRate())}`, 10, height);
  };

  const drawWaterMark = () => {
    p5.text(`https://RunArt.net`, 10, height - 30);
  };

  p5.preload = () => {
    prepareMapBackground(container, config);
    const dataUrl = buildDataUrl(config);
    console.log(dataUrl);
    activities = p5.loadJSON(dataUrl);
  };

  p5.setup = () => {
    p5.textFont("Courier New");
    p5.createCanvas(width, height);

    p5.strokeWeight(1.5);
    p5.stroke(...mainColor, 150);
    p5.fill(...mainColor, 200);
    resetCanvas()
    // the loadJSON returns array in a dict format
    activityLen = Object.keys(activities).length;
    if (exampleGpx) {
      activities = transformGpxData(activities, geo.bbox, width, height)
    }
  };

  p5.keyPressed = () => {
    //Saves Canvas as a PNG.
    if (p5.keyCode == 32) {
      p5.saveCanvas("", "png");
    }
  };

  // static
  p5.draw = () => {
    let lastPoint = false;
    p5.clear();
    baseLayer && p5.image(baseLayer, 0, 0, width, height);
    for (let k = 0; k < speed; k++) {
      let polyline = activities[currentActivity]["canvas_polyline"];
      let pos1 = polyline[currentActivityPoint];
      let pos2 = polyline[currentActivityPoint + 1];
      p5.push();
      p5.stroke(...mainColor, 100);
      p5.fill(...mainColor, 100);
      p5.strokeWeight(1);
      p5.line(pos1[0], pos1[1], pos2[0], pos2[1]);
      p5.pop();
      populateFireFly(
        new FireFly(
          p5,
          polyline[currentActivityPoint][0],
          polyline[currentActivityPoint][1],
          activities[currentActivity]["distance"] / (50 * 1000)
          // 0.5
        )
      );

      currentActivityPoint = currentActivityPoint + 1;
      if (
        currentActivityPoint >=
        activities[currentActivity]["canvas_polyline"].length - 1
      ) {
        currentActivityPoint = 0;
        distHist.add(activities[currentActivity]["distance"] / 1000);
        if (currentActivity + 1 >= activityLen) {
          lastPoint = true;
          break;
        }
        currentActivity = currentActivity + 1;
      }
    }

    baseLayer = p5.get();

    for (let k = 0; k < fireFlies.length; k++) {
      fireFlies[k].display(p5, config);
      fireFlies[k].move();
    }

    p5.push();
    p5.fill(0);
    p5.stroke(0);
    p5.pop();
    p5.push();
    p5.strokeWeight(1);
    p5.textFont("Courier New");
    p5.stroke(...mainColor, 255);
    p5.strokeWeight(1);

    p5.text(
      `${activities[currentActivity]["start_date_str"]}\n` +
        `#: ${currentActivity + 1}\n` +
        `→: ${activities[currentActivity]["cum_distance"]} KM\n` +
        `↗: ${activities[currentActivity]["cum_ascent"]} KM\n` +
        `T: ${activities[currentActivity]["cum_et"]} hr\n`,
      width - 100,
      height - 90
    );

    const distProfile = distHist.report();
    const distProfileStartY = 40;
    for (let k = 0; k < distProfile.length; k++) {
      let p = distProfile[k];
      p5.text(`${p.name}`, 10, distProfileStartY + 20 * k);
      p5.text(
        `${p.count}`,
        10 + 30 + 5 + p.count * 1.5,
        distProfileStartY + 20 * k
      );
      p5.fill(...mainColor);
      p5.rect(10 + 30, distProfileStartY - 10 + 20 * k, p.count * 1.5, 18);
    }

    drawWaterMark();
    p5.pop();
    if (lastPoint) {
      p5.noLoop();
      if (config.infiniteLoop) {
        resetCanvas();
        p5.loop();
      }
    }
  };
};

export default (containerId) => {
  return (p5) => {
    const container = p5.select(`#${containerId}`);
    const { width, height } = container;
    const config = mergeConfigParams(width, height);

    return fireflyAnimation(p5, container, config);
  };
};
