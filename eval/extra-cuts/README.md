# Extra boundary cuts (TransNet, etc.)

JSON **arrays of numbers** (interior cut times in **seconds**, film-absolute for the source file).

- **`ran-ranshort-transnet.json`** — TransNet V2 (`python3 -m pipeline.transnet_cuts … --device cpu`) on `~/videos/ranshort.mov`; **54** cuts.

Use with ingest or detect-export:

- **`--extra-cuts eval/extra-cuts/ran-ranshort-transnet.json`**, or  
- **`METROVISION_EXTRA_BOUNDARY_CUTS_JSON`** pointing at the same file.

See **`pipeline/transnet_cuts.py`** and **`pipeline/requirements-transnet.txt`**.
