import argparse
import hashlib
import json
import os
import re
from collections import defaultdict
from functools import reduce

import requests

FIRST_COLOR = "fff"
GENERAL_COLOR = "777"


class DotTrack:
    LIVE_DOT_TRACK_PREFIX = "https://live.dottrack.asia"

    DURATION_PATTERN = re.compile(
        r'(?P<hours>\d+):(?P<minutes>\d+):(?P<seconds>\d+)')

    def __init__(self, project, cache_dir="cache"):
        self.project = project
        self.url_prefix = f"{DotTrack.LIVE_DOT_TRACK_PREFIX}/{project}"
        self.point_duration_seconds = 120
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)

    def fetch(self, path):
        url = self.url_prefix + path
        local_cache = f"{self.cache_dir}/{self.sha1sum(url)}.json"
        if os.path.exists(local_cache):
            with open(local_cache) as cache_file:
                return json.load(cache_file)
        response = requests.get(url)
        response_json = response.json()
        with open(local_cache, "w") as cache_file:
            json.dump(response_json, cache_file)
        return response_json

    def fetch_teams(self):
        teams_resp = self.fetch("/data/teams.json")
        teams_by_label = {class_item["classlabel"]: class_item["teams"] for
                          class_item in
                          teams_resp["data"]}
        all_teams = reduce(lambda a, b: a + b, teams_by_label.values())
        first_team = None
        if len(all_teams) > 0:
            finished_teams = [team for team in all_teams if team["lc"] == "Finish"]
            if len(finished_teams) > 0:
                sorted_finisher = sorted(finished_teams, key=lambda x: x["t"])
                first_team = sorted_finisher[0]["r"]

        elapsed = {x["r"]: self.parse_elapsed(x["t"])
                   for x in all_teams if x["t"]}
        return all_teams, teams_by_label, first_team, elapsed

    def fetch_replay_locations(self):
        replay_resp = self.fetch("/data/replay.json?v=1")
        return replay_resp["data"]["locations"]

    def parse_elapsed(self, elapsed_str):
        duration = DotTrack.DURATION_PATTERN.match(elapsed_str).groupdict()
        return (int(duration['hours']) * 3600
                + int(duration['minutes']) * 60) // self.point_duration_seconds

    @staticmethod
    def sha1sum(value):
        sha1 = hashlib.sha1()
        sha1.update(value.encode('utf-8'))
        return sha1.hexdigest()


def prepare():
    os.makedirs("cache", exist_ok=True)
    os.makedirs("output", exist_ok=True)


def transform_to_firefly(replay_locations, first_team, elapsed, colors):
    teams_locations = defaultdict(list)
    for locs in replay_locations:
        remain = 0
        for k in elapsed.keys():
            if not teams_locations.get(k) \
                    or len(teams_locations[k]) < elapsed[k]:
                remain += 1
        if remain == 0:
            break
        moved = set()
        for loc in locs:
            if not elapsed.get(loc['id']):
                continue
            moved.add(loc['id'])
            teams_locations[loc['id']].append([loc['lo'], loc['la']])
        for k in teams_locations.keys():
            if k not in moved \
                    and len(teams_locations[k]) < elapsed[k]:
                teams_locations[k].append(teams_locations[k][-1])

    def determine_color(team):
        customized = colors.get(str(team))
        if customized:
            return customized
        return FIRST_COLOR if team == first_team else GENERAL_COLOR

    def build_single(team, locations):
        return {
            "meta": {"color": determine_color(team)},
            "tracks": [{
                "canvas_polyline": locations,
            }],
        }

    return [build_single(team, locations)
            for team, locations in teams_locations.items()]


def build(args):
    dot_track = DotTrack(args.project)
    colors = json.loads(args.color) if args.color else {}
    _, _, first, elapsed = dot_track.fetch_teams()
    print(f"First team: {first}.")
    locations = dot_track.fetch_replay_locations()
    result = transform_to_firefly(locations, first, elapsed, colors)
    output_result(args.output, result)
    print("Build done.")


def output_result(output_dir, result):
    os.makedirs(output_dir, exist_ok=True)
    with open(f"{output_dir}/firefly.json", 'w') as firefly_file:
        json.dump(result, firefly_file)


def run():
    parser = argparse.ArgumentParser(
        prog='build_firefly',
        description='Build GPX data for firefly')
    parser.add_argument("-p", "--project", type=str, required=True)
    parser.add_argument("--color", type=str)
    parser.add_argument("-o", "--output", type=str, default="output")
    args = parser.parse_args()
    build(args)


if __name__ == "__main__":
    run()
