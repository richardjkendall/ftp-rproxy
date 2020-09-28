# ftp-rproxy

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/richardjkendall/ftp-rproxy/build-image) ![Docker Image Size (tag)](https://img.shields.io/docker/image-size/richardjkendall/ftp-rproxy/latest)

Reverse proxy for FTP based on proftpd and mod_proxy.  It is available on docker: https://hub.docker.com/r/richardjkendall/ftp-rproxy

## How to use

The application creates a proftpd.conf which routes traffic towards the discovered backend.  It expects the following environment variables to be set

| Variable|Value|Mandatory|
|---|---|---|
|SRV_RECORD|Name of the DNS SRV record we should be using to find the backend servers|yes|
|REFRESH_RATE|Number of seconds between each attempt to discover new backends, defaults to 60|no|

## Example

To run with docker issue the following command

```bash
docker run \
  --name ftpproxy \
  --network host \
  -e SRV_RECORD=backend_srv_record \
  richardjkendall/ftp-rproxy
```
