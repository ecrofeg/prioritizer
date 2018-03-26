<?php

namespace App\Http\Controllers;

// use Illuminate\Support\Facades\Redis;
use GuzzleHttp\Client;

class IssuesController extends Controller
{
	protected $client = null;
	
	public function __construct() {
		$this->client = new Client([
			'base_uri' => env('REDMINE_API_URL'),
			'headers' => [
				'X-Redmine-API-Key' => env('REDMINE_API_KEY')
			]
		]);
	}
	
	public function index() {
		return $this->makeRedmineRequest('issues');
	}
	
	/**
	 * @param string $uri
	 * @param array $params
	 *
	 * @return \Psr\Http\Message\StreamInterface
	 */
	protected function makeRedmineRequest(string $uri, array $params = []) {
		$defaultParams = [
			'assigned_to_id' => 'me'
		];
		
		$requestParams = array_merge($defaultParams, $params);
		
		$response = $this->client->get($uri . '.json', [
			'query' => $requestParams,
		]);
		
		return $response->getBody();
	}
}
