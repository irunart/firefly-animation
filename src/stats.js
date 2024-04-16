import { BaseComponent } from "./component";

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
    const ret = [
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

class Stats extends BaseComponent {
  constructor() {
    super();
    this.hist = new Hist([5, 10, 20, 40, 80]);
    this.activityStartDate = "";
    this.activitySeq = 0;
    this.cumDistance = 0;
    this.cumElevationGain = 0;
    this.cumElapsedTime = 0;
  }

  includeInFinalView() {
    return true;
  }

  onActivityStarted(idx, activity) {
    this.activityStartDate = activity["start_date_str"];
    this.activitySeq = idx + 1;
  }

  onActivityFinished(activity) {
    this.hist.add(activity["distance"] / 1000);
    this.cumDistance = activity["cum_distance"];
    this.cumElevationGain = activity["cum_ascent"];
    this.cumElapsedTime = activity["cum_et"];
  }

  draw(style, width, height) {
    style.text((p5, { mainColor }) => {
      p5.text(
        `${this.activityStartDate}\n` +
          `#: ${this.activitySeq}\n` +
          `→: ${this.cumDistance} KM\n` +
          `↗: ${this.cumElevationGain} KM\n` +
          `T: ${this.cumElapsedTime} hr\n`,
        width - 100,
        height - 90
      );

      const distProfile = this.hist.report();
      const distProfileStartY = 40;
      for (let k = 0; k < distProfile.length; k++) {
        let p = distProfile[k];
        p5.text(`${p.name}`, 10, distProfileStartY + 20 * k);
        p5.text(`${p.count}`, 10 + 30 + 5 + p.count * 1.5, distProfileStartY + 20 * k);
        p5.fill(...mainColor);
        p5.rect(10 + 30, distProfileStartY - 10 + 20 * k, p.count * 1.5, 18);
      }
    });
  }
}

export default Stats;
