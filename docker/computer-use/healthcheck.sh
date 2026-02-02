#!/bin/bash
# Health check script

# Check if Python process is running
pgrep -x python > /dev/null
exit $?
