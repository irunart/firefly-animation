import { hexToRgb } from "../colors";

const transformSingleGpxData = (data, bbox, width, height) =>
  Object.values(data).map((route) => {
    const { canvas_polyline, ...rest } = route;
    const line = canvas_polyline.map(([x, y]) => [
      ((x - bbox[0]) / (bbox[2] - bbox[0])) * width,
      ((bbox[3] - y) / (bbox[3] - bbox[1])) * height,
    ]);
    return { canvas_polyline: line, ...rest };
  });

const transformGpxData = (data, bbox, width, height) => ({
  threads: [
    {
      tracks: transformSingleGpxData(data, bbox, width, height),
    },
  ],
});

const transformRaceGpxData = (data, bbox, width, height) => {
  return {
    threads: Object.values(data).map(({ meta, tracks }) => ({
      meta: {
        mainColor: meta?.color && hexToRgb(meta.color),
      },
      tracks: transformSingleGpxData(tracks, bbox, width, height),
    })),
  };
};

export default {
  summary: {
    dataSource: () => import.meta.env.FF_EXAMPLE_GPX || "./example/example.json",
    dataHandler: (activities, { geo, width, height }) => transformGpxData(activities, geo.bbox, width, height),
  },
  race: {
    dataSource: () => import.meta.env.FF_RACE_EXAMPLE_GPX || "./example/race_example.json",
    dataHandler: (activities, { geo, width, height }) => transformRaceGpxData(activities, geo.bbox, width, height),
  },
};
