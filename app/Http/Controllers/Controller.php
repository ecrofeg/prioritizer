<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use GuzzleHttp\Client;

class Controller extends BaseController {
	
	use AuthorizesRequests, DispatchesJobs, ValidatesRequests;
	
	/**
	 * @var Client
	 */
	protected $client = null;
	
	public function __construct() {
		header('Access-Control-Allow-Origin: *');
		
		$this->client = new Client([
			'base_uri' => env('REDMINE_API_URL'),
			'headers'  => [
				'X-Redmine-API-Key' => env('REDMINE_API_KEY'),
			],
		]);
	}
	
	
	/**
	 * @param string $text
	 *
	 * @return array
	 */
	protected function error(string $text) {
		return abort(500, $text);
	}
	
	/**
	 * @param string $uri
	 * @param array $params
	 *
	 * @return \stdClass
	 */
	protected function makeRedmineRequest(string $uri, array $params = []): \stdClass {
		$response = $this->client->get($uri . '.json', [
			'query' => $params,
		]);
		
		return json_decode($response->getBody()->getContents());
	}
}
