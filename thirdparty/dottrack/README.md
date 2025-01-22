# Build data for Firefly

- Prepare environment and build data:

  ```
  # Create python environment
  $ virtualenv .venv && source .venv/bin/activate

  # Install dependencies
  $ pip install -r requirements.txt

  # Build data
  $ python build_firefly.py -p 24hk4tuc

  # Build data with customized color
  $ python build_firefly.py -p 24hk4tuc --color '{"18": "ff5733", "15": "ff00ff"}'
  ```

- Try it in local firefly:

  ```
  # Set FF_RACE_EXAMPLE_GPX environment
  $ export FF_RACE_EXAMPLE_GPX="./thirdparty/dottrack/output/firefly.json"

  # Start firefly
  $ yarn && yarn dev
  ```

- Go to web page: `http://localhost:5173/?mode=race&speed=1&firefly=3&color=777&segment=7`
