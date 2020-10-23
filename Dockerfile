ARG DEBIAN_VERSION=stretch-slim 

##### Building stage #####
FROM debian:${DEBIAN_VERSION} as builder
MAINTAINER Tareq Alqutami <tareqaziz2010@gmail.com>

# Versions of nginx, rtmp-module and ffmpeg 
ARG  NGINX_VERSION=1.17.5
ARG  NGINX_RTMP_MODULE_VERSION=1.2.1
ARG  FFMPEG_VERSION=4.2.1

# Install dependencies
RUN apt-get update && \
	apt-get install -y \
		wget build-essential ca-certificates \
		openssl libssl-dev yasm \
		libpcre3-dev librtmp-dev libtheora-dev \
		libvorbis-dev libvpx-dev libfreetype6-dev \
		libmp3lame-dev libx264-dev libx265-dev && \
    rm -rf /var/lib/apt/lists/*
	
		
# Download nginx source
RUN mkdir -p /tmp/build && \
	cd /tmp/build && \
	wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
	tar -zxf nginx-${NGINX_VERSION}.tar.gz && \
	rm nginx-${NGINX_VERSION}.tar.gz

# Download rtmp-module source
RUN cd /tmp/build && \
    wget https://github.com/arut/nginx-rtmp-module/archive/v${NGINX_RTMP_MODULE_VERSION}.tar.gz && \
    tar -zxf v${NGINX_RTMP_MODULE_VERSION}.tar.gz && \
	rm v${NGINX_RTMP_MODULE_VERSION}.tar.gz

# Build nginx with nginx-rtmp module
RUN cd /tmp/build/nginx-${NGINX_VERSION} && \
    ./configure \
        --sbin-path=/usr/local/sbin/nginx \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --http-log-path=/var/log/nginx/access.log \		
        --pid-path=/var/run/nginx/nginx.pid \
        --lock-path=/var/lock/nginx.lock \
        --http-client-body-temp-path=/tmp/nginx-client-body \
        --with-http_ssl_module \
        --with-threads \
        --add-module=/tmp/build/nginx-rtmp-module-${NGINX_RTMP_MODULE_VERSION} && \
    make -j $(getconf _NPROCESSORS_ONLN) && \
    make install

# Download ffmpeg source
RUN cd /tmp/build && \
  wget http://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.gz && \
  tar -zxf ffmpeg-${FFMPEG_VERSION}.tar.gz && \
  rm ffmpeg-${FFMPEG_VERSION}.tar.gz
  
# Build ffmpeg
RUN cd /tmp/build/ffmpeg-${FFMPEG_VERSION} && \
  ./configure \
	  --enable-version3 \
	  --enable-gpl \
	  --enable-small \
	  --enable-libx264 \
	  --enable-libx265 \
	  --enable-libvpx \
	  --enable-libtheora \
	  --enable-libvorbis \
	  --enable-librtmp \
	  --enable-postproc \
	  --enable-swresample \ 
	  --enable-libfreetype \
	  --enable-libmp3lame \
	  --disable-debug \
	  --disable-doc \
	  --disable-ffplay \
	  --extra-libs="-lpthread -lm" && \
	make -j $(getconf _NPROCESSORS_ONLN) && \
	make install
	
# Copy stats.xsl file to nginx html directory and cleaning build files
RUN cp /tmp/build/nginx-rtmp-module-${NGINX_RTMP_MODULE_VERSION}/stat.xsl /usr/local/nginx/html/stat.xsl && \
	rm -rf /tmp/build

##### Building the final image #####
FROM debian:${DEBIAN_VERSION}

# Install dependencies
RUN apt-get update && \
	apt-get install -y \
		ca-certificates openssl libpcre3-dev curl gnupg \
		librtmp1 libtheora0 libvorbis-dev libmp3lame0 \
		apt-transport-https ca-certificates \
		libvpx4 libx264-dev libx265-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Node & Yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg > pubkey.gpg 
RUN apt-key add pubkey.gpg 
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh

RUN apt-get update && \
	apt-get install -y \
	yarn nodejs


# Copy files from build stage to final stage	
COPY --from=builder /usr/local /usr/local
COPY --from=builder /etc/nginx /etc/nginx
COPY --from=builder /var/log/nginx /var/log/nginx
COPY --from=builder /var/lock /var/lock
COPY --from=builder /var/run/nginx /var/run/nginx

# Forward logs to Docker
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Copy  nginx config file to container
COPY conf/nginx.conf /etc/nginx/nginx.conf

# Copy  html players to container
COPY players /usr/local/nginx/html/players
COPY players/hls_hlsjs.html /usr/local/nginx/html/index.html

COPY socketServer/demo.html /usr/local/nginx/html/socket/index.html

# NodeJS SocketServer
RUN nodejs -v

COPY socketServer /usr/src
WORKDIR /usr/src
RUN yarn install

RUN yarn start&
CMD ["yarn", "start"]
#CMD [ "node", "app/server.js" ]

EXPOSE 3000
EXPOSE 1935
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
