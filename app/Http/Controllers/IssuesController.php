<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Redis;
use GuzzleHttp\Client;

class IssuesController extends Controller {
	
	const BUGS_DAY_INDEX = '3';
	const DEADLINE_FOR_PLAN_ID = 25;
	const NEED_COMMENTS_STATUS_ID = 4;
	
	protected $prioritiesWeight = [
		'3' => 0, // низкий
		'4' => 10, // средний
		'5' => 20, // высокий
		'6' => 100, // критический
		'7' => 200, // блокер
	];
	
	protected $client = null;
	
	protected $isBugsDay = false;
	
	public function __construct() {
		$this->client = new Client([
			'base_uri' => env('REDMINE_API_URL'),
			'headers'  => [
				'X-Redmine-API-Key' => env('REDMINE_API_KEY'),
			],
		]);
		
		$this->isBugsDay = date('N') === static::BUGS_DAY_INDEX;
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
		$issueIsInPlan = $this->issueIsInPlan($issue);
		
		if ($issue->status->id === static::NEED_COMMENTS_STATUS_ID) {
			$result += 15;
		}
		
		if ($issueIsInPlan) {
			$result += $this->isBugsDay ? -15 : 15;
		}
		
		$issue->rating = $result;
		
		return $result;
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return bool
	 */
	protected function issueIsInPlan(\stdClass $issue): bool {
		$result = false;
		
		if (isset($issue->custom_fields)) {
			foreach ($issue->custom_fields as $field) {
				if ($field->id === static::DEADLINE_FOR_PLAN_ID && $field->value) {
					$result = true;
					false;
				}
			}
		}
		
		return $result;
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
			'assigned_to_id' => 'me',
		];
		
		$requestParams = array_merge($defaultParams, $params);
		
		$response = $this->client->get($uri . '.json', [
			'query' => $requestParams,
		]);
		
		return json_decode($response->getBody()->getContents());
	}
}
