/**
 * Copyright (c) 2017, FinancialForce.com, inc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, 
 *   are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *      this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *      this list of conditions and the following disclaimer in the documentation 
 *      and/or other materials provided with the distribution.
 * - Neither the name of the FinancialForce.com, inc nor the names of its contributors 
 *      may be used to endorse or promote products derived from this software without 
 *      specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES 
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
 *  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, 
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 *  OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

'use strict';

const
	root = require('app-root-path'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),
	sinonChai = require('sinon-chai'),
	sinon = require('sinon'),
	amqp = require('amqplib'),

	configValidator = require(root + '/src/lib/index/shared/configValidator'),

	mocks = {},

	sandbox = sinon.sandbox.create(),
	expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('index/shared/amqp.js', () => {

	let AmqpService;

	beforeEach(() => {
		sandbox.stub(configValidator, 'validate').returns(undefined);
		mocks.action = sandbox.stub();
		mocks.channel = sandbox.stub();
		mocks.connection = {
			createChannel: sandbox.stub().resolves(mocks.channel)
		};
		mocks.amqp = {
			connect: sandbox.stub(amqp, 'connect').resolves(mocks.connection)
		};
		mocks.config = {
			cloudamqpUrl: 'test'
		};
		AmqpService = require(root + '/src/lib/index/shared/amqp');
	});

	afterEach(() => {
		const amqpServicePath = require.resolve(root + '/src/lib/index/shared/amqp');
		delete require.cache[amqpServicePath];
		sandbox.restore();
	});

	describe('apply', () => {

		describe('should handle error', () => {

			it('from amqp.connect', () => {
				// given
				mocks.amqp.connect.rejects(new Error('bad'));

				// when
				return expect(AmqpService.apply(mocks.action, mocks.config))
					.to.eventually.be.rejectedWith('bad')
					// then
					.then(() => {
						expect(mocks.amqp.connect).to.have.been.calledOnce;
						expect(mocks.amqp.connect).to.have.been.calledWith(mocks.config.cloudamqpUrl);
						expect(mocks.connection.createChannel).to.have.not.been.called;
						expect(mocks.action).to.have.not.been.called;
					});
			});

			it('from connection.createChannel', () => {
				// given
				mocks.connection.createChannel.rejects(new Error('bad'));

				// when
				return expect(AmqpService.apply(mocks.action, mocks.config))
					.to.eventually.be.rejectedWith('bad')
					// then
					.then(() => {
						expect(mocks.amqp.connect).to.have.been.calledOnce;
						expect(mocks.amqp.connect).to.have.been.calledWith(mocks.config.cloudamqpUrl);
						expect(mocks.connection.createChannel).to.have.been.calledOnce;
						expect(mocks.action).to.have.not.been.called;
					});
			});

			it('from action', () => {
				// given
				mocks.action.rejects(new Error('bad'));

				// when
				return expect(AmqpService.apply(mocks.action, mocks.config))
					.to.eventually.be.rejectedWith('bad')
					// then
					.then(() => {
						expect(mocks.amqp.connect).to.have.been.calledOnce;
						expect(mocks.amqp.connect).to.have.been.calledWith(mocks.config.cloudamqpUrl);
						expect(mocks.connection.createChannel).to.have.been.calledOnce;
						expect(mocks.action).to.have.been.calledOnce;
						expect(mocks.action).to.have.been.calledWith(mocks.channel);
					});
			});

		});

		it('should invoke the action', () => {
			// given/when
			return expect(AmqpService.apply(mocks.action, mocks.config))
				.to.eventually.be.fulfilled
				// then
				.then(() => {
					expect(mocks.amqp.connect).to.have.been.calledOnce;
					expect(mocks.amqp.connect).to.have.been.calledWith(mocks.config.cloudamqpUrl);
					expect(mocks.connection.createChannel).to.have.been.calledOnce;
					expect(mocks.action).to.have.been.calledOnce;
					expect(mocks.action).to.have.been.calledWith(mocks.channel);
				});
		});

		it('should lazy load the connection', () => {
			// given/when
			return expect(AmqpService.apply(mocks.action, mocks.config).then(() => AmqpService.apply(mocks.action)))
				.to.eventually.be.fulfilled
				// then
				.then(() => {
					expect(mocks.amqp.connect).to.have.been.calledOnce;
					expect(mocks.amqp.connect).to.have.been.calledWith(mocks.config.cloudamqpUrl);
					expect(mocks.connection.createChannel).to.have.been.calledTwice;
					expect(mocks.action).to.have.been.calledTwice;
					expect(mocks.action).to.have.been.calledWith(mocks.channel);
				});
		});

	});

});
