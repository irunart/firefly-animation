import { bounds, viewport } from "@mapbox/geo-viewport/geo-viewport.js";
import { hexToRgb } from "./colors";
import { BaseComponent } from "./component";
import Stats from "./stats";
import runart from "./sources/runart";
import example from "./sources/example";

const defaultConfig = {
  animation: {
    fireflyLen: 500,
    speed: 20,
  },
  theme: {
    mapStyle: "dark-v11",
    mainColor: [100, 250, 155],
    font: "Courier New",
    strokeWeight: 1,
  },
  geo: {
    city: "Hong Kong",
    lon: 114.134709835052,
    lat: 22.3549875359928,
    zoom: 10,
  },
  infiniteLoop: import.meta.env.FF_INIFINITE_LOOP,
  mode: import.meta.env.FF_DEFAULT_MODE || "summary",
  race: {
    id: undefined,
    rank: false,
  },
  title: undefined,
  strokeWeight: 1,
  year: 2024,
};

const sources = {
  runart,
  example,
};

const source = sources[import.meta.env.FF_SOURCE || "example"];

const modes = {
  summary: {
    ...source.summary,
    components: (p5, config) => [new FireflyGroup(p5, config), new Stats()],
  },
  race: {
    ...source.race,
    components: (p5, config, meta) => [new FireflyGroup(p5, config), new RaceLegend(config, meta)],
  },
};

const mapStyles = {
  dark: "dark-v11",
  light: "light-v11",
  "navigation-day": "navigation-day-v1",
  "navigation-night": "navigation-night-v1",
  outdoors: "outdoors-v12",
  satellite: "satellite-v9",
  "satellite-streets": "satellite-streets-v12",
  streets: "streets-v12",
};

const toBoolean = (s) => ["yes", "true", "1"].includes(s);

const mergeConfigParams = (width, height) => {
  const urlParams = Object.fromEntries(new URLSearchParams(window.location.search));
  const { mode: modeParam } = urlParams;
  const mode = (modes[modeParam] && modeParam) || defaultConfig.mode;
  const { year: yearParam } = urlParams;
  const year = yearParam || defaultConfig.year;
  let race;
  if (mode === "race") {
    const { raceId, rank } = urlParams;
    race = { id: raceId, rank: toBoolean(rank) };
  }

  const { loop } = urlParams;
  const infiniteLoop = loop || defaultConfig.infiniteLoop;

  let { city, lon, lat, zoom, gpsRect } = {
    ...defaultConfig.geo,
    ...urlParams,
  };
  if (gpsRect) {
    const rect = gpsRect.split(",").map((v) => parseFloat(v));
    ({
      center: [lon, lat],
      zoom,
    } = viewport([rect[0], rect[2], rect[1], rect[3]], [width, height], undefined, undefined, 512, true));
  }
  const center = { lon, lat };
  const bbox = bounds(center, parseFloat(zoom), [width, height], 512);
  const geo = { city, lon, lat, zoom, center, bbox };

  const {
    mainColor: defaultMainColor,
    mapStyle: defaultMapStyle,
    strokeWeight: defaultStrokeWeight,
  } = defaultConfig.theme;
  const { color, map, strokeWeight: weight } = urlParams;
  const mainColor = (color && hexToRgb(color)) || defaultMainColor;
  const mapStyle = mapStyles[map] || defaultMapStyle;
  const strokeWeight = (weight && Number(weight)) || defaultStrokeWeight;
  const theme = { ...defaultConfig.theme, mainColor, mapStyle, strokeWeight };

  const {
    fireflyLen: defaultFireflyLen,
    speed: defaultSpeed,
    segmentThreshold: defaultSegmentThreshold,
  } = defaultConfig.animation;
  const { firefly, speed: speedParam, segment: segmentThresholdParam } = urlParams;
  const fireflyLen = (firefly && parseInt(firefly, 10)) || defaultFireflyLen;
  const speed = (speedParam && parseInt(speedParam, 10)) || defaultSpeed;
  const segmentThreshold = (segmentThresholdParam && parseFloat(segmentThresholdParam)) || defaultSegmentThreshold;
  const animation = { ...defaultConfig.animation, fireflyLen, speed, segmentThreshold };

  return {
    ...defaultConfig,
    year,
    geo,
    width,
    height,
    animation,
    theme,
    infiniteLoop: toBoolean(infiniteLoop),
    mode,
    race,
  };
};

const mapboxToken = import.meta.env.FF_MAPBOX_TOKEN;

const mapBackgroundURL = (container, config) => {
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
  return (
    `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static` +
    `/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${mapboxToken}`
  );
};

class Firefly {
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

class FireflyGroup extends BaseComponent {
  constructor(p5, config) {
    super();
    this.fireflyFactory = (...args) => new Firefly((...ra) => p5.random(...ra), ...args);
    this.fireflyLen = config.animation.fireflyLen;
    this.fireFlies = undefined;
    this.fireflyIndex = 0;
    this.fireflySize = config.mode === "race" && 0.5;
    this.initFireFlies();
  }

  initFireFlies() {
    this.fireFlies = Array(this.fireflyLen);
    for (let k = 0; k < this.fireflyLen; k++) {
      this.fireFlies[k] = this.fireflyFactory(-1000, -1000);
    }
    this.fireflyIndex = 0;
  }

  onActivityPointForward(activity, fromPoint, toPoint) {
    const firefly = this.fireflyFactory(
      fromPoint[0],
      fromPoint[1],
      this.fireflySize || activity["distance"] / (50 * 1000)
    );
    this.fireFlies[this.fireflyIndex++] = firefly;
    if (this.fireflyIndex >= this.fireflyLen) {
      this.fireflyIndex = 0;
    }
  }

  draw(style, width, height) {
    style.with((p5, { mainColor, strokeWeight }) => {
      p5.stroke(...mainColor, 10);
      p5.strokeWeight(0.5 * strokeWeight);
      for (let k = 0; k < this.fireFlies.length; k++) {
        this.fireFlies[k].display(p5, width, height, mainColor);
        this.fireFlies[k].move();
      }
    });
  }
}

class RaceLegend extends BaseComponent {
  constructor(config, { idx, athlete, count }) {
    super();
    this.rank = config.race.rank;
    this.count = count;
    this.idx = idx;
    this.athlete = athlete;
    this.cumDistance = 0;
    this.cumElevationGain = 0;
  }

  includeInFinalView() {
    return true;
  }

  onActivityPointForward(activity, fromPoint, toPoint) {
    this.cumDistance = Math.floor(toPoint[2] / 1000);
    this.cumElevationGain = Math.floor(toPoint[3]);
    if (this.rank && toPoint.length >= 5) {
      this.idx = this.count - 1 - toPoint[4];
    }
  }

  draw(style, width, height) {
    const bottom = height - 30;
    const right = width - 10;
    style.text((p5) => {
      p5.textAlign(p5.RIGHT);
      p5.text(this.athlete, right, bottom - (this.idx * 2 + 1) * 20);
      p5.textAlign(p5.RIGHT);
      p5.text(`→: ${this.cumDistance} KM | ↗: ${this.cumElevationGain} M`, right, bottom - this.idx * 2 * 20);
    });
  }
}

class Style {
  constructor(p5, config) {
    this.config = config;
    this.theme = config.theme;
    this.p5 = p5;
  }

  text(handler) {
    this.with((p, theme) => {
      const { font, mainColor } = theme;
      // Do not apply base strokeWidth to text to avoid clutter.
      p.strokeWeight(1);
      p.textFont(font);
      p.stroke(...mainColor, 255);
      p.fill(...mainColor, 255);
      handler(p, theme);
    });
  }

  with(handler) {
    this.p5.push();
    handler(this.p5, this.theme);
    this.p5.pop();
  }
}

class ActivityThread {
  constructor(activities, components, config, style) {
    this.finished = false;
    this.activities = activities;
    this.currentActivity = 0;
    this.currentActivityPoint = 0;
    this.activityLen = Object.keys(activities).length;
    this.config = config;
    this.style = style;
    this.components = components;
    this.components.forEach((component) =>
      component.onActivityStarted(this.currentActivity, this.activities[this.currentActivity])
    );
  }

  drawAllPath() {
    this.style((p5, { mainColor, strokeWeight }) => {
      p5.clear();
      p5.strokeWeight(0.5 * strokeWeight);
      p5.stroke(...mainColor, 150);
      for (let k = 0; k < this.activityLen; k++) {
        const polyline = this.activities[k]["canvas_polyline"];
        for (let p = 0; p < polyline.length - 1; p++) {
          const pos1 = polyline[p];
          const pos2 = polyline[p + 1];
          p5.line(pos1[0], pos1[1], pos2[0], pos2[1]);
        }
      }
    });
  }

  segment_distance(pos1, pos2) {
    return Math.sqrt((pos1[0] - pos2[0]) * (pos1[0] - pos2[0]) + (pos1[1] - pos2[1]) * (pos1[1] - pos2[1]));
  }

  forward() {
    if (this.finished) {
      return true;
    }
    const {
      animation: { speed, segmentThreshold },
      theme: { mainColor, strokeWeight },
    } = this.config;
    for (let k = 0; k < speed; k++) {
      const activity = this.activities[this.currentActivity];
      const polyline = activity["canvas_polyline"];
      const pos1 = polyline[this.currentActivityPoint];
      const pos2 = polyline[this.currentActivityPoint + 1];

      if (!segmentThreshold || this.segment_distance(pos1, pos2) <= segmentThreshold) {
        this.style.with((p5) => {
          p5.stroke(...mainColor, 100);
          p5.fill(...mainColor, 100);
          p5.strokeWeight(1 * strokeWeight);
          p5.line(pos1[0], pos1[1], pos2[0], pos2[1]);
        });
      }

      this.components.forEach((p) => p.onActivityPointForward(activity, pos1, pos2));

      this.currentActivityPoint++;
      if (this.currentActivityPoint >= activity["canvas_polyline"].length - 1) {
        this.components.forEach((p) => p.onActivityFinished(activity));
        this.currentActivityPoint = 0;
        if (this.currentActivity + 1 >= this.activityLen) {
          this.finished = true;
          break;
        }
        this.currentActivity++;
        this.components.forEach((p) =>
          p.onActivityStarted(this.currentActivity, this.activities[this.currentActivity])
        );
      }
    }
    return this.finished;
  }
}

const readableElapsedTime = (sec) => {
  const result = [];
  sec = Math.floor(sec / 60);
  for (let i = 1; i < 3; i++) {
    result.push(sec % 60);
    sec = Math.floor(sec / 60);
  }
  return result
    .reverse()
    .map((v) => `${v}`.padStart(2, "0"))
    .join(":");
};

const fireflyAnimation = (p5, container, config) => {
  let allActivities;
  let threads;
  let baseLayer;
  let round = 0;
  let background;

  const {
    width,
    height,
    geo,
    theme: { mainColor, font, strokeWeight },
  } = config;
  const style = new Style(p5, config);
  const mode = modes[config.mode];

  const resetCanvas = () => {
    round = 0;
    threads = allActivities.threads.map((activities, idx, threads) => {
      const { meta, tracks } = activities;
      const { mainColor } = meta || {};
      const threadConfig = {
        ...config,
        theme: {
          ...config.theme,
          mainColor: mainColor || config.theme.mainColor,
        },
      };
      const components = mode.components(p5, threadConfig, {
        idx,
        count: threads.length,
        ...meta,
      });
      return new ActivityThread(tracks, components, threadConfig, new Style(p5, threadConfig));
    });
    p5.clear();
    p5.background(background);
    baseLayer = p5.get();
  };

  const drawFrameRate = () => {
    p5.text(`FPS: ${parseInt(p5.frameRate())}`, 10, height);
  };

  const drawWaterMark = () => {
    style.text((p5) => p5.text(`https://RunArt.net`, 10, height - 30));
  };

  const drawMeta = () => {
    const { meta } = allActivities;
    const { title, playbackInterval } = meta || {};
    if (title) {
      style.text((p5) => {
        p5.textSize(16);
        p5.text(title, 10, 30);
      });
    }
    if (playbackInterval) {
      const elapsed = readableElapsedTime(playbackInterval * round * config.animation.speed);
      style.text((p5) => {
        p5.textSize(16);
        p5.text(elapsed, 10, 60);
      });
    }
  };

  p5.preload = () => {
    const backgroundURL = mapBackgroundURL(container, config);
    background = p5.loadImage(backgroundURL);
    const dataSource = mode.dataSource(config);
    allActivities = p5.loadJSON(dataSource);
  };

  p5.setup = () => {
    p5.textFont(font);
    p5.createCanvas(width, height);

    p5.strokeWeight(1.5 * strokeWeight);
    p5.stroke(...mainColor, 150);
    p5.fill(...mainColor, 200);
    if (mode.dataHandler) {
      allActivities = mode.dataHandler(allActivities, config);
    }
    resetCanvas();
  };

  p5.keyPressed = () => {
    switch (p5.keyCode) {
      case 80: // p: Saves Canvas as a PNG.
        p5.saveCanvas("", "png");
        break;
      case 32: // Whitespace: pause
        p5.isLooping() ? p5.noLoop() : p5.loop();
        break;
    }
  };

  // static
  p5.draw = () => {
    p5.clear();
    baseLayer && p5.image(baseLayer, 0, 0, width, height);
    const finished = threads.map((t) => t.forward()).reduce((prev, curr) => prev && curr, true);

    baseLayer = p5.get();
    round++;
    drawMeta();
    drawWaterMark();

    threads.forEach((t) => {
      t.components.filter((p) => p.includeInFinalView()).forEach((p) => p.draw(t.style, width, height));
    });
    const finalView = finished && p5.get();
    threads.forEach((t) => {
      t.components.filter((p) => !p.includeInFinalView()).forEach((p) => p.draw(t.style, width, height));
    });

    if (finished) {
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
