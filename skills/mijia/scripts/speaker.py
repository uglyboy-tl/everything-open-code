#!/usr/bin/env python3
# /// script
# dependencies = [
#   "mijiaAPI>=3.0.5",
# ]
# ///
"""通过小爱音箱执行语音指令。用法: uv run scripts/speaker.py "指令" [--quiet] [--did DID]"""

import argparse
import sys
from pathlib import Path

from mijiaAPI import mijiaAPI, mijiaDevice


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", help="语音指令")
    parser.add_argument("--did", help="指定小爱音箱DID")
    parser.add_argument("-q", "--quiet", action="store_true", help="静默执行")
    args = parser.parse_args()

    api = mijiaAPI()

    if args.did:
        device = mijiaDevice(api, did=args.did)
    else:
        devices = api.get_devices_list()
        for dev in devices:
            if "xiaomi.wifispeaker" in dev["model"]:
                device = mijiaDevice(api, did=dev["did"])
                break
        else:
            print("Error: 未找到小爱音箱", file=sys.stderr)
            sys.exit(1)

    # quiet: 0=静默, 1=不静默
    device.run_action(
        "execute-text-directive", _in=[args.command, 0 if args.quiet else 1]
    )


if __name__ == "__main__":
    main()
