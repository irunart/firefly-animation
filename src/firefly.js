import { bounds } from "@mapbox/geo-viewport/geo-viewport.js";
import { BaseComponent } from "./component";
import Stats from "./stats";


const defaultConfig = {
  animation: {
    fireFlySize: 500,
    speed: 20,
  },
  theme: {
    mapStyle: "dark-v11",
    mainColor: [100, 250, 155],
    font: "Courier New",
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
  if (!mapboxToken) {
    return;
  }
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

class FireFly {
  constructor(random, x, y, mr) {
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
  display(p5, width, height, mainColor) {
    if (this.x >= 0 && this.x < width && this.y >= 0 && this.y < height) {
      let r = Math.sqrt(this.life) * this.mr * 2;
      p5.fill(...mainColor, this.life / 10);
      p5.ellipse(this.x, this.y, r, r);
    }
  }
}

class FireFlyGroup extends BaseComponent {
  constructor(p5, fireFlySize) {
    super();
    this.fireFlyFactory = (...args) =>
      new FireFly((...ra) => p5.random(...ra), ...args);
    this.fireFlySize = fireFlySize;
    this.fireFlies = undefined;
    this.fireflyIndex = 0;
    this.initFireFlies();
  }

  initFireFlies() {
    this.fireFlies = Array(this.fireFlySize);
    for (let k = 0; k < this.fireFlySize; k++) {
      this.fireFlies[k] = this.fireFlyFactory(-1000, -1000);
    }
    this.fireflyIndex = 0;
  };

  onActivityPointForward(activity, fromPoint, toPoint) {
    const firefly = this.fireFlyFactory(
      fromPoint[0], fromPoint[1], activity["distance"] / (50 * 1000),
      // 0.5
    );
    this.fireFlies[this.fireflyIndex++] = firefly;
    if (this.fireflyIndex >= this.fireFlySize) {
      this.fireflyIndex = 0;
    }
  }

  draw(style, width, height) {
    style.with((p5, { mainColor }) => {
      p5.stroke(...mainColor, 10);
      p5.strokeWeight(0.5);
      for (let k = 0; k < this.fireFlies.length; k++) {
        this.fireFlies[k].display(p5, width, height, mainColor);
        this.fireFlies[k].move();
      }
    })
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
  const { canvas_polyline, ...rest } = route
  const line = canvas_polyline.map(([x, y]) => [(x - bbox[0]) / (bbox[2] - bbox[0]) * width,
  (bbox[3] - y) / (bbox[3] - bbox[1]) * height,
  ])
  return { canvas_polyline: line, ...rest };
})

class Style {
  constructor(p5, config) {
    this.config = config;
    this.theme = config.theme;
    this.p5 = p5;
  }

  text(handler) {
    this.with((p, theme) => {
      const { font, mainColor } = theme;
      p.strokeWeight(1);
      p.textFont(font);
      p.stroke(...mainColor, 255);
      handler(p, theme);
    });
  }

  with(handler) {
    this.p5.push();
    handler(this.p5, this.theme);
    this.p5.pop();
  }
}

const fireflyAnimation = (p5, container, config) => {
  let activities;
  let currentActivity;
  let currentActivityPoint;
  let activityLen;
  let baseLayer;
  let components;
  const {
    width,
    height,
    geo,
    theme: { mainColor, font },
    animation: { fireFlySize, speed },
  } = config;
  const style = new Style(p5, config);

  const resetCanvas = () => {
    baseLayer = undefined;
    currentActivity = 0;
    currentActivityPoint = 0;
    components = [
      new FireFlyGroup(p5, fireFlySize),
      new Stats(),
    ]
    components.forEach(component =>
      component.onActivityStarted(currentActivity, activities[currentActivity]));
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
    style.text((p5) => p5.text(`https://RunArt.net`, 10, height - 30));
  };

  p5.preload = () => {
    prepareMapBackground(container, config);
    const dataUrl = buildDataUrl(config);
    console.log(dataUrl);
    activities = p5.loadJSON(dataUrl);
  };

  p5.setup = () => {
    p5.textFont(font);
    p5.createCanvas(width, height);

    p5.strokeWeight(1.5);
    p5.stroke(...mainColor, 150);
    p5.fill(...mainColor, 200);
    // the loadJSON returns array in a dict format
    activityLen = Object.keys(activities).length;
    if (exampleGpx) {
      activities = transformGpxData(activities, geo.bbox, width, height)
    }
    resetCanvas();
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

      components.forEach(p =>
        p.onActivityPointForward(activities[currentActivity], pos1, pos2));

      currentActivityPoint = currentActivityPoint + 1;
      if (
        currentActivityPoint >=
        activities[currentActivity]["canvas_polyline"].length - 1
      ) {
        components.forEach(p =>
          p.onActivityFinished(activities[currentActivity]));
        currentActivityPoint = 0;
        if (currentActivity + 1 >= activityLen) {
          lastPoint = true;
          break;
        }
        currentActivity = currentActivity + 1;
        components.forEach(p =>
          p.onActivityStarted(currentActivity, activities[currentActivity]));
      }
    }

    baseLayer = p5.get();
    drawWaterMark();

    components.filter(p => p.includeInFinalView()).forEach(p => p.draw(style, width, height));
    const finalView = lastPoint && p5.get();
    components.filter(p => !p.includeInFinalView()).forEach(p => p.draw(style, width, height));

    if (lastPoint) {
      p5.noLoop();
      resetCanvas();
      finalView && p5.image(finalView, 0, 0, width, height);
      if (config.infiniteLoop) {
        setTimeout(() => p5.loop(), 500);
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
