# Security Policy

## Container vulnerability gate

GitHub Actions scans the final backend and frontend images with Trivy. A HIGH or CRITICAL vulnerability with an available vendor fix fails the workflow and prevents the image from being pushed to GHCR.

## Temporary exception for unfixed operating-system findings

The backend uses the official `python:3.12-slim-trixie` image and runs the application as the unprivileged `careflow` user. On 14 October 2026, Trivy reported HIGH operating-system findings inherited from Debian 13 for which Debian provided no fixed package version. The vulnerable application dependencies originally reported by Trivy were upgraded; a scan that includes only findings with vendor fixes reports zero backend findings.

CI therefore uses Trivy's `ignore-unfixed` option as a temporary base-image exception. This exception does not suppress a vulnerability after its vendor publishes a fix: such a finding becomes fixable and fails CI.

Review this exception whenever the Python base image is updated, whenever CI reports a newly fixable finding, and no later than 14 November 2026. Remove the exception when an official supported base image passes the same HIGH/CRITICAL scan without it.

Do not add individual CVE exceptions or lower the severity threshold without documenting the reason, affected component, compensating controls, owner, and expiry date here.
