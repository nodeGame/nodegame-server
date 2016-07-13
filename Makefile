doc:
	@./node_modules/.bin/docker index.js lib/ -o docs

publish:
	node bin/make.js build-client -a -o nodegame-full && npm publish

test:
	@./node_modules/.bin/mocha

.PHONY: test
