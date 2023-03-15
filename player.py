#!/bin/env python
#
# Usage:
#   $ player.py /path/to/something.songsync /path/to/something.mp3 > ~/printer_data/comms/klippy.serial
#

import time
import subprocess
import sys

MPG123 = "mpg123"

def run_script(script_file_path, audio_path):
    active_effects = set()

    with open(script_file_path, 'r') as f:
        def klippycmd(line):
            sys.stdout.write(line + "\n")
            sys.stdout.flush()
        with subprocess.Popen([MPG123, "-R"], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL) as player:
            def playercmd(line):
                player.stdin.write((line + "\n").encode())
                player.stdin.flush()

            playercmd("LP {}".format(audio_path))
            time.sleep(1)
            playercmd("P")
            try:
                for line in f:
                    action, args = line.split(':', 1)
                    if action == 'sleep':
                        time.sleep(float(args.strip()))
                    elif action == 'on':
                        klippycmd("SET_LED_EFFECT EFFECT={} RESTART=1".format(args.strip()))
                        active_effects.add(args.strip())
                    elif action == 'off':
                        klippycmd("SET_LED_EFFECT EFFECT={} STOP=1".format(args.strip()))
                        active_effects.remove(args.strip())
            except KeyboardInterrupt:
                for e in active_effects:
                    klippycmd("SET_LED_EFFECT EFFECT={} STOP=1".format(e))
                sys.exit()


if __name__ == "__main__":
    run_script(sys.argv[1], sys.argv[2])
