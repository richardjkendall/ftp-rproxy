FROM ubuntu:20.04

# install sqlite
RUN apt-get update
RUN apt-get install -y sqlite

# install nodejs
RUN apt-get install -y curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs build-essential

# install cfgmaker script
RUN mkdir -p /cfgmaker
COPY cfgmaker/ /cfgmaker/
RUN cd /cfgmaker; echo "no cache"; npm ci

# copy in proftpd
COPY proftpd /usr/local/sbin/proftpd

# add libs needed by proftpd
RUN apt-get install -y libc6

# copy in mod_proxy
COPY mod_proxy.* /usr/local/libexec/

# make folder for scorecard
RUN mkdir /var/proftpd

# make sure PID file exists
RUN mkdir -p /usr/local/var
RUN touch /usr/local/var/proftpd.pid

# add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl --fail http://localhost:3000/ || exit 1

# replace entrypoint script
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["proftpd", "-c", "/etc/proftpd.conf", "--nodaemon", "-4"]

