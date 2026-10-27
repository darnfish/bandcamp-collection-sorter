# node:24-trixie-slim, pinned by digest (multi-arch index, Node 24.22.1, 2026-10-21)
ARG NODE_IMAGE=node:24-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea

# Install production dependencies only, from the lockfile.
FROM ${NODE_IMAGE} AS deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production --non-interactive \
	&& yarn cache clean

# Runtime: node, the app and its dependencies. No npm, npx, corepack or yarn.
FROM ${NODE_IMAGE}
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-v* \
	/usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
	/usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json index.js ./
# The app writes collection_items.json, albums.json and unmatched.txt here.
RUN chown node:node /usr/src/app
USER node
CMD ["node", "index.js"]
