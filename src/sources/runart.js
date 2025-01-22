import { hexToRgb } from "../colors";

const buildSummaryDataUrl = (config) => {
  const prefix = import.meta.env.FF_SUMMARY_DATA_URL_PREFIX || "/firefly_animation_data/2023";
  const {
    width,
    height,
    year,
    geo: { bbox },
  } = config;
  const gpsRect = [bbox[0], bbox[2], bbox[1], bbox[3]];
  return `${prefix}/${year}/${gpsRect.join(",")}/${width},${height}/`;
};

const summaryHandler = (activities, config) => ({
  threads: [{ tracks: activities }],
});

const buildRaceDataUrl = (config) => {
  const prefix = import.meta.env.FF_RACE_DATA_URL_PREFIX || "/race/projection";
  const {
    width,
    height,
    geo: { bbox },
  } = config;
  const gpsRect = [bbox[0], bbox[2], bbox[1], bbox[3]].join(",");
  const url = `${prefix}/${config.race.id}/${gpsRect}/${width},${height}/`;
  return url;
};

const transformRaceData = (data, config) => {
  const { activities, title, playback_interval: playbackInterval } = data;
  return {
    meta: { title, playbackInterval },
    threads: Object.values(activities).map((meta) => {
      const { athlete_firstname, athlete_lastname, color } = meta;
      const athlete = [athlete_firstname, athlete_lastname].filter((n) => !!n).join(" ");
      return {
        meta: {
          athlete,
          mainColor: hexToRgb(color.substr(1)),
        },
        tracks: [{ canvas_polyline: data.tracks[meta.activity_id] }],
      };
    }),
  };
};

export default {
  summary: {
    dataSource: buildSummaryDataUrl,
    dataHandler: summaryHandler,
  },
  race: {
    dataSource: buildRaceDataUrl,
    dataHandler: transformRaceData,
  },
};
