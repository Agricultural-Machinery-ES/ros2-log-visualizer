# ROS 2 Log Directory Structure and Format Guide

This document describes the structure and format of ROS 2 logs as found in the `~/.ros/log` directory of this environment. Use this information to parse and visualize logs.

## 1. Directory Structure

The root log directory is `~/.ros/log`.

### Session Directories
Each time a ROS 2 launch or a set of nodes is started, a new session directory is created with the following naming convention:
`YYYY-MM-DD-HH-MM-SS-MICROSECONDS-HOSTNAME-PID`
Example: `2026-05-16-05-47-59-650999-MSI-MED-126664`

Inside each session directory:
- `launch.log`: Contains the output from the launch system itself, including process start/stop events.

### Node Log Files
Individual node logs are located directly in the root `~/.ros/log/` directory (not inside the session directories in this environment).
Naming convention: `<node_name>_<pid>_<unix_timestamp_ms>.log`
Example: `job_orchestrator_node_126669_1778910479813.log` (where `1778910479813` is milliseconds since epoch).

## 2. Log Formats

### Node Logs (`<node_name>_*.log`)
Format: `[LEVEL] [TIMESTAMP] [NODE_NAME]: MESSAGE`
- **LEVEL**: Log level (e.g., `INFO`, `WARN`, `ERROR`, `DEBUG`).
- **TIMESTAMP**: Unix epoch time with nanoseconds (e.g., `1778900771.830085555`).
- **NODE_NAME**: The name of the ROS node that generated the log.
- **MESSAGE**: The actual log message content.

Example:
`[INFO] [1778900771.830085555] [foxglove_bridge]: Starting foxglove_bridge (foxy, 3.2.6@9a7d53f1)`

### Launch Logs (`launch.log`)
Format: `TIMESTAMP [LEVEL] [launch]: MESSAGE`
- **TIMESTAMP**: Unix epoch time with nanoseconds.
- **LEVEL**: Log level (usually `INFO`).
- **MESSAGE**: Information about process management (e.g., `process started with pid [126667]`).

Example:
`1778910479.8045323 [INFO] [job_orchestrator_node-2]: process started with pid [126669]`

## 3. Correlation
To associate a node log file with a specific launch session:
1. Parse `launch.log` in a session directory to find the PIDs of the started processes.
2. Match those PIDs with the `<pid>` part of the node log filenames in the root `~/.ros/log/` directory.
