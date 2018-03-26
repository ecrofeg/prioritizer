<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Redis;
use GuzzleHttp\Client;

class IssuesController extends Controller
{
	protected $prioritiesWeight = [
		'3' => 0,
		'4' => 1,
		'5' => 2,
		'6' => 3,
		'7' => 4
	];
	
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
		try {
			$user = $this->getCurrentUser();
			$issues = Redis::get('issues:user:' . $user->id);
			
			if ($issues) {
				$issues = json_decode($issues);
			}
			else {
				$response = $this->makeRedmineRequest('issues');
				
				if (isset($response->issues)) {
					$issues = $response->issues;
					Redis::set('issues:user:' . $user->id, json_encode($issues));
				}
				else {
					throw new \Exception('No issues found');
				}
			}
			
			usort($issues, function ($a, $b) {
				return $this->getPriorityForIssue($b) <=> $this->getPriorityForIssue($a);
			});
			
			return $issues;
		}
		catch (\Exception $exception) {
			return $this->error($exception->getMessage());
		}
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return int
	 */
	protected function getPriorityForIssue(\stdClass $issue): int {
		$result = $this->prioritiesWeight[$issue->priority->id];
		
		return $result;
	}
	
	/**
	 * @param string $text
	 *
	 * @return array
	 */
	protected function error(string $text) {
		var_dump($text);
		return abort(500, $text);
	}
	
	/**
	 * @return object
	 * @throws \Exception
	 */
	protected function getCurrentUser(): object {
		$response = $this->makeRedmineRequest('users/current');
		
		if (!isset($response->user)) {
			throw new \Exception('Unauthorized');
		}
		
		return $response->user;
	}
	
	/**
	 * @param string $uri
	 * @param array $params
	 *
	 * @return object
	 */
	protected function makeRedmineRequest(string $uri, array $params = []): object {
		$defaultParams = [
			'assigned_to_id' => 'me'
		];
		
		$requestParams = array_merge($defaultParams, $params);
		
		$response = $this->client->get($uri . '.json', [
			'query' => $requestParams,
		]);
		
		return json_decode($response->getBody()->getContents());
	}
}
