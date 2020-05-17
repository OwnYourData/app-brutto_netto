FROM ruby:2.5.3
MAINTAINER "Christoph Fabianek" christoph@ownyourdata.eu

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		build-essential \
		nodejs && \
	rm -rf /var/lib/apt/lists/*

ENV RAILS_ROOT $WORKDIR
RUN mkdir -p $RAILS_ROOT/tmp/pids
COPY Gemfile $WORKDIR

RUN gem update --system && \
	gem install bundler && \
	bundle install && \
	bundle update --bundler

COPY . .

RUN bundle update

CMD ["bin/rails", "server", "-b", "0.0.0.0"]

EXPOSE 3000
