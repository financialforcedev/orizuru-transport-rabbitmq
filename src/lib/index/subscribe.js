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
	_ = require('lodash'),
	Amqp = require('./shared/amqp'),

	EventEmitter = require('events'),

	ERROR_EVENT = 'error_event',

	emitter = new EventEmitter(),

	subscribeAction = ({ topic, handler, channel, config }) => {
		// Ensure the topic exists
		channel.assertQueue(topic);
		// Set prefetch
		if (config.prefetch && _.isInteger(config.prefetch)) {
			channel.prefetch(config.prefetch);
		}
		// Subscribe to the topic
		return channel.consume(topic, message => {
			return Promise.resolve(message.content)
				.then(handler)
				.catch(err => emitter.emit(ERROR_EVENT, err.message))
				.then(result => channel.ack(message)); // finally
		});
	},

	handle = ({ eventName, handler, config }) => {
		// Opens a connection to the RabbitMQ server, and subscribes to the topic
		return Amqp.apply(channel => subscribeAction({ topic: eventName, handler, channel, config }), config)
			.catch(err => {
				emitter.emit(ERROR_EVENT, err.message);
				throw err;
			});
	};

emitter.ERROR = ERROR_EVENT;

module.exports = {
	handle,
	emitter
};
